"use client";

import { useState, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { AddPill, FIELD, ROW_INPUT, Row, Rows } from "./EventFormKit";

export interface PriceTierDraft {
  name: string;
  priceStr: string;
  seatsStr?: string;
}

/** The pricing fields of the experience form that this card edits. */
export interface GuestPaymentValue {
  priceCents: number;
  useTiers: boolean;
  priceTiers: PriceTierDraft[];
  monthlyPassEnabled: boolean;
  monthlyPassPriceStr: string;
  monthlyPassSessionsStr: string;
  monthlyPassCapacityStr: string;
}

interface Props {
  value: GuestPaymentValue;
  onChange: (patch: Partial<GuestPaymentValue>) => void;
  /** Repeating or several-dates events can sell a monthly pass. */
  repeating: boolean;
  showErrors?: boolean;
  /** Shown under the pass when it is on (e.g. the pass holders list). */
  passExtra?: ReactNode;
}

const priceText = (cents: number) => (cents > 0 ? String(cents / 100) : "");
const decimalOk = (s: string) => s === "" || /^\d*\.?\d*$/.test(s);
const digitsOk = (s: string) => s === "" || /^\d+$/.test(s);

// GuestPaymentCard is the paid half of "How do guests pay?": one list of
// everything a guest can buy. A single price is one row; "Add ticket type"
// turns it into named tickets (each with a price and an optional seat limit);
// "Add monthly pass" adds the pass to the same list on repeating events.
export default function GuestPaymentCard({
  value: v,
  onChange,
  repeating,
  showErrors,
  passExtra,
}: Props) {
  // The single price is typed as text so "12." or "" don't get rewritten.
  const [priceStr, setPriceStr] = useState(priceText(v.priceCents));
  // Follow outside changes (event loaded, converted from tickets) without
  // rewriting what the host is typing.
  const [seenCents, setSeenCents] = useState(v.priceCents);
  if (seenCents !== v.priceCents) {
    setSeenCents(v.priceCents);
    if (Math.round((parseFloat(priceStr) || 0) * 100) !== v.priceCents)
      setPriceStr(priceText(v.priceCents));
  }

  const setTier = (i: number, patch: Partial<PriceTierDraft>) =>
    onChange({
      priceTiers: v.priceTiers.map((t, j) =>
        j === i ? { ...t, ...patch } : t,
      ),
    });

  const addTicketType = () => {
    if (v.useTiers) {
      onChange({ priceTiers: [...v.priceTiers, { name: "", priceStr: "" }] });
      return;
    }
    // The single price becomes the first ticket, "General".
    const kept = v.priceTiers.filter((t) => t.name.trim());
    onChange({
      useTiers: true,
      priceTiers:
        kept.length > 0
          ? kept
          : [
              { name: "General", priceStr: priceText(v.priceCents) },
              { name: "", priceStr: "" },
            ],
    });
  };

  const useOnePrice = () => {
    const first = v.priceTiers.find((t) => Number(t.priceStr) > 0);
    onChange({
      useTiers: false,
      priceCents: first
        ? Math.round(Number(first.priceStr) * 100)
        : v.priceCents,
    });
  };

  const noValidTier =
    v.useTiers &&
    v.priceTiers.filter((t) => t.name.trim() && Number(t.priceStr) > 0)
      .length === 0;
  const passNeedsSessions =
    v.monthlyPassEnabled &&
    Number(v.monthlyPassPriceStr) > 0 &&
    !(Number(v.monthlyPassSessionsStr) >= 1);

  return (
    <div className="space-y-3">
      {!v.useTiers ? (
        <Rows>
          <Row
            label="Price per person (₹)"
            error={showErrors && v.priceCents <= 0}
          >
            <input
              type="text"
              inputMode="decimal"
              value={priceStr}
              onChange={(e) => {
                const s = e.target.value;
                if (!decimalOk(s)) return;
                setPriceStr(s);
                onChange({
                  priceCents: Math.round((parseFloat(s) || 0) * 100),
                });
              }}
              placeholder="e.g. 499"
              className={ROW_INPUT}
            />
          </Row>
        </Rows>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_7rem_5.5rem_2rem] gap-2 px-1 text-xs text-white/40">
            <span>Ticket</span>
            <span>Price (₹)</span>
            <span>Seats</span>
            <span />
          </div>
          {v.priceTiers.map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_7rem_5.5rem_2rem] items-center gap-2"
            >
              <input
                type="text"
                value={t.name}
                onChange={(e) => setTier(i, { name: e.target.value })}
                placeholder="e.g. Gold"
                aria-label="Ticket name"
                className={`${FIELD} !py-2.5`}
              />
              <input
                type="text"
                inputMode="decimal"
                value={t.priceStr}
                onChange={(e) =>
                  decimalOk(e.target.value) &&
                  setTier(i, { priceStr: e.target.value })
                }
                placeholder="499"
                aria-label="Ticket price"
                className={`${FIELD} !py-2.5`}
              />
              <input
                type="text"
                inputMode="numeric"
                value={t.seatsStr ?? ""}
                onChange={(e) =>
                  digitsOk(e.target.value) &&
                  setTier(i, { seatsStr: e.target.value })
                }
                placeholder="Any"
                aria-label="Seats per session (blank = no limit)"
                title="Seats per session. Leave blank for no limit."
                className={`${FIELD} !py-2.5`}
              />
              {v.priceTiers.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      priceTiers: v.priceTiers.filter((_, j) => j !== i),
                    })
                  }
                  className="p-1.5 text-white/40 transition hover:text-red-400"
                  aria-label={`Remove ${t.name || "ticket"}`}
                >
                  <FiX className="h-5 w-5" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
          <p
            className={`px-1 text-xs ${showErrors && noValidTier ? "text-red-400" : "text-white/40"}`}
          >
            {showErrors && noValidTier
              ? "Give at least one ticket a name and a price."
              : "Seats caps a ticket per session (e.g. 10 Gold). Blank means no limit."}
          </p>
        </div>
      )}

      <AddPill onClick={addTicketType}>
        {v.useTiers ? "Add another ticket type" : "Add ticket type"}
      </AddPill>
      {v.useTiers && (
        <button
          type="button"
          onClick={useOnePrice}
          className="px-1 text-xs font-medium text-[#D8B4FE] hover:text-white"
        >
          Use one price for everyone instead
        </button>
      )}

      {repeating &&
        (v.monthlyPassEnabled ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-white">
                Monthly pass
              </span>
              <button
                type="button"
                onClick={() => onChange({ monthlyPassEnabled: false })}
                className="text-xs font-medium text-white/50 hover:text-red-400"
              >
                Remove
              </button>
            </div>
            <Rows>
              <Row
                label="Pass price (₹)"
                error={showErrors && !(Number(v.monthlyPassPriceStr) > 0)}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={v.monthlyPassPriceStr}
                  onChange={(e) =>
                    decimalOk(e.target.value) &&
                    onChange({ monthlyPassPriceStr: e.target.value })
                  }
                  placeholder="2500"
                  className={ROW_INPUT}
                />
              </Row>
              <Row
                label="Sessions included"
                error={showErrors && passNeedsSessions}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={v.monthlyPassSessionsStr}
                  onChange={(e) =>
                    digitsOk(e.target.value) &&
                    onChange({ monthlyPassSessionsStr: e.target.value })
                  }
                  placeholder="e.g. 8"
                  className={ROW_INPUT}
                />
              </Row>
              <Row label="Passes available">
                <input
                  type="text"
                  inputMode="numeric"
                  value={v.monthlyPassCapacityStr}
                  onChange={(e) =>
                    digitsOk(e.target.value) &&
                    onChange({ monthlyPassCapacityStr: e.target.value })
                  }
                  placeholder="No limit"
                  className={ROW_INPUT}
                />
              </Row>
            </Rows>
            <p className="px-1 text-xs text-white/40">
              Guests pay once and use the sessions within 30 days.
            </p>
            {passExtra}
          </div>
        ) : (
          <AddPill onClick={() => onChange({ monthlyPassEnabled: true })}>
            Add monthly pass
          </AddPill>
        ))}
    </div>
  );
}
