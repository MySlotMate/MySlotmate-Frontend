# MySlotMate social banners

Final PNGs, already at each platform's exact pixel size. Upload them as they are, with no cropping.

| File | Upload to | Size |
|---|---|---|
| `linkedin-personal-1584x396.png` | Your LinkedIn profile → Edit background photo | 1584 × 396 |
| `linkedin-company-1128x191.png` | MySlotMate LinkedIn page → Edit page → Cover image | 1128 × 191 |
| `facebook-cover-1640x624.png` | Facebook page → Edit cover photo | 1640 × 624 |
| `x-header-1500x500.png` | X profile → Edit profile → Header | 1500 × 500 |
| `youtube-banner-2560x1440.png` | YouTube Studio → Customisation → Branding → Banner image | 2560 × 1440 |
| `profile-picture-1080x1080.png` | Profile picture on all platforms (purple) | 1080 × 1080 |
| `profile-picture-dark-1080x1080.png` | Alternative dark profile picture | 1080 × 1080 |

Instagram has no cover banner, so use the profile picture there.

`previews-with-safe-zones/` shows the same banners with dashed green lines marking where each platform crops the image or puts the profile photo. Those files are for checking only, so don't upload them.

## Design
- The scene is the website hero: a night city with a violet horizon, stars, and the sparkle from the logo.
- The headline is the site's own line, "Life happens when you **show up.**", with "show up." in the brand gradient (#7B2FFF → #A020F0 → #BF00FF). The font is Outfit.
- The photos are real MySlotMate events (Sip & Paint, Crochet Circle, Open Mic, Plate to Fame, Adventure), shown as Polaroids.
- The signature element is a "Slot booked" ticket, which shows what the product does in one glance.

## Editing
Change copy, photos or layout in `source/build.mjs`, then run `source/render.sh` (it needs Google Chrome and Node). All PNGs are rebuilt at exact size.
