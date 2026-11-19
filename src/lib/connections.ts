"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Connections between people on MySlotMate (phase 1: you connect with hosts,
 * and their upcoming experiences show up first for you).
 *
 * The backend has no connections API yet (see docs/connections.md). Until it
 * does, connections are kept on this device so the whole flow — Connect
 * button, "From your connections" on Home, the count on your profile — can be
 * built and tested. Swap the three storage helpers below for API calls once
 * the endpoints exist; the hook's shape stays the same.
 */

const KEY = "msm_connections_v1";
const EVENT = "msm:connections";

export interface Connection {
  /** The other person's host id (phase 1 only connects to hosts). */
  hostId: string;
  /** ISO time the connection was made. */
  at: string;
}

function read(): Connection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Connection[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: Connection[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: the toggle just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useConnections() {
  const [list, setList] = useState<Connection[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setList(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isConnected = useCallback(
    (hostId: string | null | undefined) =>
      Boolean(hostId) && list.some((c) => c.hostId === hostId),
    [list],
  );

  const toggle = useCallback((hostId: string) => {
    const now = read();
    const next = now.some((c) => c.hostId === hostId)
      ? now.filter((c) => c.hostId !== hostId)
      : [...now, { hostId, at: new Date().toISOString() }];
    write(next);
    return next.some((c) => c.hostId === hostId);
  }, []);

  return {
    /** False until read on the client, so buttons don't flash. */
    ready,
    connections: list,
    hostIds: list.map((c) => c.hostId),
    count: list.length,
    isConnected,
    toggle,
  };
}
