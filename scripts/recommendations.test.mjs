// Guards the recommendation filter: only live, upcoming, non-full events with a
// mood may be recommended. Run: node scripts/recommendations.test.mjs
import assert from "node:assert/strict";
import {
  isRecommendable,
  getRecommendedEventSync,
} from "../src/lib/recommendations.ts";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

const base = {
  id: "candidate",
  title: "Aesthetic DIY Day",
  mood: "creative",
  status: "live",
  time: future,
  capacity: 10,
  total_bookings: 9,
};
const booked = { ...base, id: "booked", title: "Booked one" };

assert.equal(isRecommendable(base, booked), true, "live upcoming event");
assert.equal(
  isRecommendable({ ...base, status: "paused" }, booked),
  false,
  "paused event must not be recommended",
);
assert.equal(
  isRecommendable({ ...base, status: "draft" }, booked),
  false,
  "draft event must not be recommended",
);
assert.equal(isRecommendable({ ...base, time: past }, booked), false, "past");
assert.equal(
  isRecommendable({ ...base, total_bookings: 10 }, booked),
  false,
  "full",
);
assert.equal(
  isRecommendable({ ...base, mood: null }, booked),
  false,
  "no mood",
);
assert.equal(isRecommendable(booked, booked), false, "the booked event itself");

// End to end: a paused event is the only mood match -> no popup at all.
assert.equal(
  getRecommendedEventSync(booked, [{ ...base, status: "paused" }])
    .recommendedEvent,
  null,
  "paused-only pool yields no recommendation",
);
assert.equal(
  getRecommendedEventSync(booked, [base]).recommendedEvent?.id,
  "candidate",
  "live pool still recommends",
);

console.log("recommendations: all assertions passed");
