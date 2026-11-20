"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  connectHost,
  currentAuthHeader,
  disconnectHost,
  getMyConnections,
} from "~/lib/api";

/**
 * Connections between people on MySlotMate (phase 1: you connect with hosts,
 * and their upcoming experiences show up first for you).
 *
 * Stored on the backend (/users/me/connections), so they follow you across
 * devices and count on the host's profile. Connections made before the
 * backend existed were kept in this browser; they're sent up once, the first
 * time you're signed in, and then cleared.
 */

const LEGACY_KEY = "msm_connections_v1";
const QUERY_KEY = ["myConnections"] as const;

export interface Connection {
  /** The host's id (phase 1 only connects to hosts). */
  hostId: string;
  /** ISO time the connection was made. */
  at: string;
}

interface State {
  signedIn: boolean;
  list: Connection[];
}

function readLegacy(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const list = raw ? (JSON.parse(raw) as { hostId?: string }[]) : [];
    return Array.isArray(list)
      ? list.map((c) => c.hostId).filter((id): id is string => !!id)
      : [];
  } catch {
    return [];
  }
}

async function fetchConnections(): Promise<State> {
  // Signed out: nothing to ask the server for.
  const auth = await currentAuthHeader();
  if (!auth.Authorization) return { signedIn: false, list: [] };

  // One-time move of connections saved in this browser before the API.
  const legacy = readLegacy();
  if (legacy.length) {
    const results = await Promise.allSettled(legacy.map(connectHost));
    if (results.every((r) => r.status === "fulfilled"))
      localStorage.removeItem(LEGACY_KEY);
  }

  const res = await getMyConnections();
  const list = (res.data ?? []).map((c) => ({
    hostId: c.host_id,
    at: c.created_at,
  }));
  return { signedIn: true, list };
}

export function useConnections() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchConnections,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // Signing in or out changes whose connections these are.
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    void import("~/utils/firebase").then(({ auth }) => {
      if (cancelled) return;
      let first = true;
      off = auth.onIdTokenChanged((user) => {
        // The first call just reports the restored session.
        if (first) {
          first = false;
          return;
        }
        void qc.invalidateQueries({ queryKey: QUERY_KEY });
        if (!user)
          qc.setQueryData<State>(QUERY_KEY, { signedIn: false, list: [] });
      });
    });
    return () => {
      cancelled = true;
      off?.();
    };
  }, [qc]);

  const list = q.data?.list ?? [];

  const isConnected = useCallback(
    (hostId: string | null | undefined) =>
      Boolean(hostId) && list.some((c) => c.hostId === hostId),
    [list],
  );

  /**
   * Connect or disconnect. Updates the screen straight away and rolls back
   * if the server says no. Returns the new state.
   */
  const toggle = useCallback(
    (hostId: string) => {
      const prev = qc.getQueryData<State>(QUERY_KEY) ?? {
        signedIn: true,
        list: [],
      };
      const wasOn = prev.list.some((c) => c.hostId === hostId);
      const next: State = {
        ...prev,
        list: wasOn
          ? prev.list.filter((c) => c.hostId !== hostId)
          : [{ hostId, at: new Date().toISOString() }, ...prev.list],
      };
      qc.setQueryData(QUERY_KEY, next);

      void (wasOn ? disconnectHost(hostId) : connectHost(hostId))
        .then(() => {
          // The host's connection count changed too.
          void qc.invalidateQueries({ queryKey: ["publicHostProfile"] });
        })
        .catch((e: unknown) => {
          qc.setQueryData(QUERY_KEY, prev);
          toast.error(
            e instanceof Error &&
              e.message &&
              !e.message.startsWith("Request failed")
              ? e.message
              : "Couldn't update the connection. Please try again.",
          );
        });
      return !wasOn;
    },
    [qc],
  );

  return {
    /** False until loaded, so buttons don't flash the wrong state. */
    ready: !q.isLoading,
    signedIn: q.data?.signedIn ?? false,
    connections: list,
    hostIds: list.map((c) => c.hostId),
    count: list.length,
    isConnected,
    toggle,
  };
}
