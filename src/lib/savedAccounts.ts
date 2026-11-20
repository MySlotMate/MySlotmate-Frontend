"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Accounts used on this device, for the switcher in Settings (like
 * Instagram's "Switch accounts"). Only what's needed to show the list and
 * prefill the login is kept: name, photo, email or phone. No tokens or
 * passwords; switching signs you in to that account again.
 */

const KEY = "msm_saved_accounts_v1";
const EVENT = "msm:saved-accounts";
const MAX = 5;

export interface SavedAccount {
  /** Backend user id. */
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  /** How they signed in, so switching opens the right login. */
  method: "google" | "phone";
  lastUsed: number;
}

/** What the login screen needs to go straight to one account. */
export interface LoginHint {
  method: "google" | "phone";
  email?: string | null;
  phone?: string | null;
  name?: string | null;
}

function read(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(list) ? (list as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

function write(list: SavedAccount[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: the list just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Add or refresh an account; the most recent comes first. */
export function rememberAccount(a: Omit<SavedAccount, "lastUsed">) {
  const rest = read().filter((x) => x.id !== a.id);
  const next = [{ ...a, lastUsed: Date.now() }, ...rest].slice(0, MAX);
  const prev = read();
  // Skip the write (and the re-render it triggers) when nothing changed.
  const same =
    prev[0]?.id === a.id &&
    prev[0].name === a.name &&
    prev[0].photo === a.photo &&
    prev[0].email === a.email &&
    prev[0].phone === a.phone;
  if (!same) write(next);
}

export function forgetAccount(id: string) {
  write(read().filter((x) => x.id !== id));
}

export function useSavedAccounts() {
  const [list, setList] = useState<SavedAccount[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const forget = useCallback((id: string) => forgetAccount(id), []);
  return { accounts: list, forget };
}
