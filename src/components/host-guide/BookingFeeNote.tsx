"use client";

import { usePlatformSetting } from "~/hooks/useApi";

/**
 * The guest booking fee as it stands now. Read live from the server: the fee
 * is changed from the admin, so the guide never hard-codes it.
 */
export default function BookingFeeNote() {
  const { data: fee } = usePlatformSetting<{
    type?: "flat" | "percentage";
    amount_cents?: number;
    percentage?: number;
  }>("booking_fee");

  let amount: string | null = null;
  if (fee?.type === "percentage" && (fee.percentage ?? 0) > 0) {
    amount = `${fee.percentage}% of the ticket price`;
  } else if (fee?.type === "flat" && (fee.amount_cents ?? 0) > 0) {
    amount = `₹${((fee.amount_cents ?? 0) / 100).toLocaleString("en-IN")} per booking`;
  }
  if (!amount) return null;

  return (
    <p className="mt-3 text-sm leading-6 text-[#A5A8C3]">
      Right now guests pay a booking fee of{" "}
      <span className="font-semibold text-white">{amount}</span> (GST included)
      on top of your price. It goes to MySlotMate, not out of your earnings.
    </p>
  );
}
