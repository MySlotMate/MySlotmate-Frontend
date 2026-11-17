"use client";

import { ArrowUpRight } from "lucide-react";
import { BecomeHostModal } from "~/components/become-host";
import { useListTimeAction } from "~/hooks/useListTimeAction";
import { GRADIENT } from "../shared";

/**
 * Approved hosts go straight to creating a slot; everyone else gets the
 * become-a-host prompt, which leads into the application.
 */
export default function StartHostingButton({
  label = "Start hosting",
}: {
  label?: string;
}) {
  const {
    closeBecomeHostModal,
    handleListTimeClick,
    hostStatus,
    showBecomeHostModal,
  } = useListTimeAction();

  return (
    <>
      <button
        type="button"
        onClick={handleListTimeClick}
        className={`font-outfit flex h-12 items-center gap-1.5 rounded-full px-6 text-base font-semibold text-white shadow-[0_12px_40px_-12px_rgb(160_32_240/0.8)] ${GRADIENT}`}
      >
        {hostStatus === "approved" ? "Create an event" : label}
        <ArrowUpRight className="h-4 w-4" />
      </button>
      <BecomeHostModal
        open={showBecomeHostModal}
        onClose={closeBecomeHostModal}
      />
    </>
  );
}
