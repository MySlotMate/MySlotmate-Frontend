# Journey milestone badges — backend spec

The **My journey** page (`/activities`) shows milestone badges. For now the web app works them out on the client from the guest's completed bookings (`src/lib/badges.ts`). This doc describes the backend version, so badges can be stored, sent as notifications, and shown the same way in the mobile app.

The award rules below must match `BADGES` in `src/lib/badges.ts`. If you change one, change the other.

## What counts as a "moment"

A moment is one booking that:

- has `status = 'confirmed'`, and
- has an `occurrence_date` in the past.

Cancelled and refunded bookings never count. All time-of-day and day-of-week checks use **IST** (Asia/Kolkata).

Category checks use the same mapping as the web app: the event's `mood` maps to a category key through `categoryOf()` in `src/lib/categories.ts`. The backend should keep a copy of that mood-to-category table, or store the category on the event.

## Badges

| key                | Name             | Rule                                          | Target |
| ------------------ | ---------------- | --------------------------------------------- | ------ |
| `first-step`       | First Step       | Any moment                                    | 1      |
| `weekend-wanderer` | Weekend Wanderer | Moment on a Saturday or Sunday                | 1      |
| `trailblazer`      | Trailblazer      | Category `adventure`                          | 1      |
| `social-spark`     | Social Spark     | Category `social`                             | 3      |
| `made-by-hand`     | Made by Hand     | Category `arts` or `design`                   | 1      |
| `shared-table`     | Shared Table     | Category `food` or `cooking`                  | 1      |
| `rooted`           | Rooted           | Category `culture`                            | 1      |
| `calm-corner`      | Calm Corner      | Category `wellness` or `mindfulness`          | 1      |
| `early-bird`       | Early Bird       | Starts between 05:00 and 08:59                | 1      |
| `night-owl`        | Night Owl        | Starts at 20:00 or later, or before 04:00     | 1      |
| `learner`          | Always Learning  | A 1:1 session (`kindOf(event) === 'session'`) | 1      |
| `plus-one`         | Brought a Friend | Booking `quantity >= 2`                       | 1      |
| `regular`          | Regular          | Any moment                                    | 5      |
| `curious-mind`     | Curious Mind     | Distinct categories, not counting `other`     | 3      |
| `familiar-faces`   | Familiar Faces   | Two moments with the same `host_id`           | 2      |
| `ten-stories`      | Ten Stories      | Any moment                                    | 10     |

A badge is earned by the moment that reaches its target, with moments in date order. That booking is the badge's `booking_id`, and its `occurrence_date` is `earned_at`.

## Table

```sql
CREATE TABLE user_badges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key    TEXT NOT NULL,
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  earned_at    TIMESTAMPTZ NOT NULL,
  seen_at      TIMESTAMPTZ,            -- null until the guest has opened it
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
```

Badges are earned once and never taken away. If a booking is refunded later, the badge stays.

## When to award

Check a user's badges again whenever one of their bookings becomes a moment:

- **Scheduled job:** an hourly job that finds confirmed bookings whose `occurrence_date` passed since the last run. This is the main path.
- **QR check-in:** also run it on the host's QR scan (`/host-dashboard/scan`), so the badge appears straight after the guest checks in.

The check is idempotent. Load the user's moments, run the rules, and insert any missing `badge_key` with `ON CONFLICT DO NOTHING`.

## Endpoints

### `GET /users/{user_id}/badges`

Returns every badge, earned or not, with progress for locked ones.

```json
{
  "data": [
    {
      "key": "social-spark",
      "earned": false,
      "current": 1,
      "target": 3,
      "earned_at": null,
      "booking_id": null,
      "event_id": null,
      "seen": false
    },
    {
      "key": "first-step",
      "earned": true,
      "current": 1,
      "target": 1,
      "earned_at": "2026-07-25T00:30:00+05:30",
      "booking_id": "…",
      "event_id": "…",
      "seen": true
    }
  ]
}
```

Names, copy and art stay in the client (`src/lib/badges.ts`, `public/assets/badges/{key}.webp`), so the API only sends keys and numbers.

### `POST /users/{user_id}/badges/{key}/seen`

Sets `seen_at`. The app uses it to show a "new badge" highlight only once.

## Notifications

When a badge is inserted, create a notification:

- `type`: `badge_earned`
- title: `You earned "{Name}"`
- body: the badge's earned line, for example "A Saturday well spent at {event title}."
- link: `/activities`

Push it to the mobile app too. Keep the copy warm and platonic: this is a companion and time-booking platform, so no dating or romantic wording.

## Frontend switch-over

Once the endpoint is live, change `computeBadges` on `/activities` to merge the server's `earned`, `earned_at` and `booking_id` over the client result. Keep the client rules as a fallback.
