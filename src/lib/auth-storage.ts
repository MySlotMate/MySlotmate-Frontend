"use client";

export const AUTH_STORAGE_EVENT = "myslotmate:auth-storage-updated";

/**
 * Set when someone logs out, cleared when someone logs in. It is shared by
 * every tab, so a tab still holding an old Firebase session in memory knows
 * not to restore the login, and logs itself out instead.
 */
export const LOGGED_OUT_KEY = "msm_logged_out_at";

export const getLoggedOutAt = (): number | null => {
  if (typeof window === "undefined") return null;
  const v = Number(localStorage.getItem(LOGGED_OUT_KEY));
  return Number.isFinite(v) && v > 0 ? v : null;
};

export const getStoredUserId = () =>
  typeof window === "undefined" ? null : localStorage.getItem("msm_user_id");

export const getStoredHostId = () =>
  typeof window === "undefined" ? null : localStorage.getItem("msm_host_id");

export const emitAuthStorageChange = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(AUTH_STORAGE_EVENT, {
      detail: {
        userId: getStoredUserId(),
        hostId: getStoredHostId(),
      },
    }),
  );
};

export const setStoredUserId = (userId: string) => {
  if (typeof window === "undefined") return;

  localStorage.setItem("msm_user_id", userId);
  localStorage.removeItem(LOGGED_OUT_KEY);
  emitAuthStorageChange();
};

export const setStoredHostId = (hostId: string) => {
  if (typeof window === "undefined") return;

  localStorage.setItem("msm_host_id", hostId);
  emitAuthStorageChange();
};

export const clearStoredAuth = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("msm_user_id");
  localStorage.removeItem("msm_host_id");
  localStorage.removeItem("msm_auth_token");
  emitAuthStorageChange();
};
