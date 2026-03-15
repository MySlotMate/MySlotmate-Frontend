"use client";

import { useState, useEffect } from "react";
import { LuX, LuWallet, LuLoader2 } from "react-icons/lu";
import { useCreateTopupOrder, useVerifyTopupPayment } from "~/hooks/useApi";

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentBalance: number; // in paise
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

const PRESET_AMOUNTS = [10000, 50000, 100000, 200000]; // in paise (₹100, ₹500, ₹1000, ₹2000)

export default function TopUpModal({
  isOpen,
  onClose,
  userId,
  currentBalance,
  userName,
  userEmail,
  userPhone,
}: TopUpModalProps) {
  const [amount, setAmount] = useState(50000); // default ₹500
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCreateTopupOrder();
  const verifyPayment = useVerifyTopupPayment();

  // Load Razorpay script
  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  const handlePresetSelect = (preset: number) => {
    setIsCustom(false);
    setAmount(preset);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, "");
    setCustomAmount(numericValue);
    setIsCustom(true);
    if (numericValue) {
      setAmount(parseInt(numericValue) * 100); // Convert rupees to paise
    }
  };

  const handleTopUp = async () => {
    if (amount < 10000) {
      setError("Minimum top-up amount is ₹100");
      return;
    }
    if (amount > 10000000) {
      setError("Maximum top-up amount is ₹1,00,000");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      // Create Razorpay order
      const orderRes = await createOrder.mutateAsync({
        user_id: userId,
        amount_cents: amount,
        idempotency_key: crypto.randomUUID(),
      });

      const orderData = orderRes.data;

      // Open Razorpay Checkout
      const options: RazorpayOptions = {
        key: orderData.key_id,
        amount: orderData.amount_cents,
        currency: orderData.currency ?? "INR",
        name: "MySlotMate",
        description: "Wallet Top-up",
        order_id: orderData.order_id,
        handler: (response: RazorpayResponse) => {
          // Verify payment
          void (async () => {
            try {
              await verifyPayment.mutateAsync({
                user_id: userId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              onClose();
            } catch {
              setError("Payment verification failed. Please contact support.");
            }
            setIsProcessing(false);
          })();
        },
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        theme: {
          color: "#0094CA",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch {
      setError("Failed to create order. Please try again.");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e6f8ff]">
              <LuWallet className="h-5 w-5 text-[#0094CA]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Money</h2>
              <p className="text-sm text-gray-500">
                Balance: {formatCurrency(currentBalance)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        {/* Preset amounts */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Quick Select</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetSelect(preset)}
                className={`rounded-lg border-2 py-2 text-sm font-semibold transition ${
                  !isCustom && amount === preset
                    ? "border-[#0094CA] bg-[#e6f8ff] text-[#0094CA]"
                    : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {formatCurrency(preset)}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-gray-700">
            Or enter custom amount
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-500">
              ₹
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter amount"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className={`w-full rounded-lg border-2 py-3 pl-10 pr-4 text-lg font-semibold outline-none transition ${
                isCustom
                  ? "border-[#0094CA] ring-2 ring-[#0094CA]/20"
                  : "border-gray-200 focus:border-[#0094CA]"
              }`}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Min ₹100 • Max ₹1,00,000</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Amount summary */}
        <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Amount to add</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(amount)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="text-sm text-gray-600">New balance</span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(currentBalance + amount)}
            </span>
          </div>
        </div>

        {/* Add Money button */}
        <button
          onClick={handleTopUp}
          disabled={isProcessing || amount < 10000}
          className="w-full rounded-xl bg-[#0094CA] py-3.5 text-base font-bold text-white transition hover:bg-[#007dab] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <LuLoader2 className="h-5 w-5 animate-spin" />
              Processing...
            </span>
          ) : (
            `Add ${formatCurrency(amount)}`
          )}
        </button>

        {/* Secure payment note */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Secure payment via Razorpay • 100% Safe
        </p>
      </div>
    </>
  );
}
