"use client";

export const AUTH_STORAGE_EVENT = "myslotmate:auth-storage-updated";

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
  emitAuthStorageChange();
};
