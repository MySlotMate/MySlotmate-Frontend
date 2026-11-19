# Profiles and connections — backend spec

> The up-to-date, shareable version of this spec is the backend PRD: https://claude.ai/artifact/CCbfsWosQXmAYpFnWMWiwy

The web app now has one profile layout for everyone: explorers, free hosts and verified hosts. People can **Connect** with a host from the host's profile. Once connected, that host's upcoming experiences show first on Home under **From your connections**.

The backend has no connections API yet, so the web app keeps connections **on the device** for now (`src/lib/connections.ts`, localStorage key `msm_connections_v1`). They don't sync across devices, hosts can't see who connected, and the host's connection count can't be shown. This spec covers what the backend needs so the app can switch over. The hook's shape stays the same; only the three storage helpers in that file change to API calls.

## What "connect" means

| Phase          | Who connects        | How it works                                                                   |
| -------------- | ------------------- | ------------------------------------------------------------------------------ |
| **1 (now)**    | Anyone → a host     | One-way, accepted straight away, like following. No request to approve.        |
| **2 (social)** | Explorer ↔ explorer | A request the other person accepts. Hosts can also turn on "approve requests". |

MySlotMate is a platonic companion and time-booking platform. Connect is for friends, groups and mentors. It must never be framed as dating, and the report and block tools below apply to it.

## Phase 1

### Table

```sql
CREATE TABLE connections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- who pressed Connect
  host_id      UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,  -- who they connected with
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, host_id)
);
CREATE INDEX connections_host_idx ON connections (host_id);
```

### Endpoints (all signed in, except the count)

| Method   | Path                              | Does                                                              |
| -------- | --------------------------------- | ----------------------------------------------------------------- |
| `GET`    | `/users/me/connections`           | Hosts I'm connected with: `[{ host_id, created_at }]`             |
| `PUT`    | `/users/me/connections/{host_id}` | Connect. Idempotent: returns 200 if already connected.            |
| `DELETE` | `/users/me/connections/{host_id}` | Disconnect. Idempotent.                                           |
| `GET`    | `/hosts/{host_id_or_slug}`        | Add `connections_count` to `PublicHostProfileDTO`. Public.        |
| `GET`    | `/hosts/me/connections`           | For the host dashboard: who's connected, newest first, paginated. |

- **Self-connect:** you can't connect with yourself. If `host.user_id = me`, return 400.
- **Rate limit:** around 60 connects an hour per user, to stop bulk following.

### Notifications

- **New event:** when a host publishes a **public** event, notify their connections, the same way Eventbrite notifies organiser followers.
  - Send at most 2 a day per host, so a host publishing many events doesn't flood people.
  - Private events never notify.
- **Host side:** optionally, a weekly digest for the host: "12 new connections this week".

### Home feed

The app currently filters the public events list on the client by the connected host IDs. Once the table exists, an optional `GET /events/?connected=1` (signed in) can return that list directly.

## Needed now: a host's past events (public)

Host profiles show **0 past experiences** for hosts who have run events, such as Dank Curry (`/host/ayushman-bhuyan`). The cause is on the backend:

| Endpoint                | Returns                                 | Problem                                          |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| `GET /events/`          | Upcoming live events only               | Past events drop out                             |
| `GET /events/host/{id}` | All of a host's events, drafts included | Needs that host's own login, so visitors get 401 |

No public endpoint returns a host's history. I tried `/hosts/{id}/events`, `/events/?host_id=`, `/events/?past=true` and others; they 404 or ignore the filter.

**Add:** `GET /hosts/{host_id_or_slug}/events`. It's public.

- **What it returns:** all of that host's `live` and `paused` events, past included, newest first.
- **What it leaves out:** `draft`, `cancelled` and private events, and `access_passkey`.
- **Optional extras:** paging (`?limit=&before=`), and `events_hosted_count` / `guests_hosted_count` on `PublicHostProfileDTO`. With those, the profile numbers wouldn't depend on admin overrides.

The web app already calls this endpoint (`getPublicHostEvents` in `src/lib/api.ts`). Until it exists, the call 404s and the Past tab says "Past experiences coming soon". It also shows any of the host's past events the viewer went to. Once the endpoint ships, the Past tab and the numbers fill in with no frontend change.

## Photos

The Photos tab is made of named **profile albums**, shown as folder tiles. Credentials are just another album. Photos a host adds to a past event reach guests' journeys through the event's `gallery_urls`. The full spec (tables, endpoints, limits) is in the shared backend PRD: https://claude.ai/artifact/CCbfsWosQXmAYpFnWMWiwy

## Phase 1.5 — public profiles for explorers

Right now only hosts have a public page (`/host/{slug}`). Explorers see their own profile at `/profile`, but nobody else can view it. To let people view and connect with each other:

- `GET /users/{id}/public`, returning:
  - `id`, `name`, `avatar_url`, `city`, `created_at`
  - `experiences_joined` (a count)
  - `badges` (keys from `docs/journey-badges.md`)
  - `host_slug` if they host, otherwise `null`
- Never return email, phone, bookings or anything from `attendee-profile`.
- A privacy setting `profile_visibility`: `everyone` (default) or `connections`. When set to `connections`, everyone else gets 404.
- Web route: `/people/{id}`, which reuses `ProfileHero` and `ProfileTabs` from `src/components/profile/ProfileKit.tsx`.

## Phase 2 — explorer ↔ explorer (social)

- **Table changes:** add `status` (`pending` | `accepted`) and `responded_at` to `connections`, and a `target_user_id` column so a connection can point at a person, not just a host.
- **Request endpoints:**
  - `POST /connections/requests/{user_id}`
  - `POST /connections/requests/{id}/accept`
  - `POST /connections/requests/{id}/decline`
  - `GET /connections/requests` (incoming and outgoing)
- **"In common" data:** mutual connections, and events both people went to. Luma calls the latter "events together". It shows on profiles to build trust.

## Safety (needed before phase 2 launches)

- **Block:** `POST /users/{id}/block`. It removes any connection both ways, hides each person's profile from the other, and stops new requests.
- **Report:** `POST /reports` with `target_type: "user" | "host"`. This reuses the existing support/report flow.
- **No direct messages in this phase.** Connections only change what you see. Event inboxes stay the only way to message, as now.
- Run profile text (bio, tagline) through `src/lib/moderation.ts`, the same rules as event listings, including the no-dating rule.

## What the web app already does

| Piece                                                                             | Where                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------- |
| Profile layout (hero, stats, tabs, side cards)                                    | `src/components/profile/ProfileKit.tsx`     |
| Your own profile: experiences, hosting, milestones, connections                   | `src/app/profile/page.tsx`                  |
| Host profile with Connect, trust card and "you've been to N of their experiences" | `src/app/host/[slug]/HostProfileClient.tsx` |
| Connections store (device-only for now)                                           | `src/lib/connections.ts`                    |
| Home row "From your connections"                                                  | `src/components/home/HomeFeed.tsx`          |
