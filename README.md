# Brixx's 1st birthday — invitation & RSVP

The kalo-leaf invitation as a web page, hosted on Windmill. Guests tap the leaf to
turn it over for the details, then RSVP on the same page. Each RSVP is saved inside
Windmill and emails you the reply, the running totals and the full guest list as a
spreadsheet (brixx-rsvps.csv).

Deploys automatically on every push to `main`.

## What's in here

```
u/brianne/brixx_birthday.raw_app/     ← the Windmill app (path u/brianne/brixx_birthday)
  raw_app.yaml                        ← public, custom URL "brixx-turns-one"
  index.tsx, App.tsx, index.css       ← the page (React)
  leaf.ts                             ← the exact leaf outline + veins from the printed card
  backend/submit_rsvp.ts              ← saves the RSVP, emails you with the spreadsheet attached
u/brianne/brixx_invite_sender.raw_app/ ← private page for texting invitations (only you can open it)
  App.tsx, index.css                  ← guest list, message, tap-to-text buttons
  backend/load.ts, backend/save.ts    ← keeps the guest list in Windmill
wmill.yaml                            ← limits `wmill sync push` to these two apps only
.github/workflows/deploy.yml          ← build check + deploy on push to main
```

RSVPs are stored in your Windmill workspace as a resource at `u/brianne/brixx_rsvps`
(created automatically on the first RSVP; open **Resources** in Windmill to see it).
Every submission is kept; if someone RSVPs again with the same name, the totals and
spreadsheet use their latest answer. No database or data table is needed.

## One-time setup

### 1. Email (Gmail app password)

1. Google Account → Security → turn on **2-Step Verification** (required for app passwords).
2. Google Account → search **App passwords** → create one called "Windmill RSVP". Copy the 16-character password.
3. In Windmill → **Resources → + Resource**, type **smtp**, saved at path `u/brianne/rsvp_smtp`:
   - host `smtp.gmail.com`, port `465`
   - user: your Gmail address
   - password: the app password from step 2
4. In Windmill → **Variables → + Variable** at path `u/brianne/rsvp_notify_email`:
   the address that should receive RSVP emails.

Neither the password nor your address is stored in this repo.

### 2. GitHub secrets

Repo → Settings → Secrets and variables → Actions. Same values as `ugc-portfolio`:

- `WM_BASE_URL` e.g. `https://app.windmill.dev`
- `WM_WORKSPACE` your workspace id
- `WM_TOKEN` a Windmill token that can deploy apps

### 3. Deploy

Push to `main`, or run **Deploy to Windmill** from the Actions tab. When it's done,
open the app in Windmill to copy its public link (it uses the custom path
`brixx-turns-one`), and point the QR code at that link.

## Sending invitations by text

Open the **Brixx turns one — send invitations** app in Windmill (on your phone is
easiest). Paste the invitation link and your guest list (one "name, phone" per line),
then tap **Text** next to each guest: Messages opens with their personalized invite
and you hit send. The page remembers who you've texted and shows who has RSVP'd.
The guest list is saved at `u/brianne/brixx_guest_list` (Resources, type "state").
This page is private: there is no `public` line in its `raw_app.yaml`.

## Troubleshooting email

Every RSVP writes an entry to **Resources → `u/brianne/brixx_rsvp_log`** in Windmill
(newest first): whether the RSVP saved, whether the email was sent, and if not,
the exact step that failed with a plain-language hint. The same step-by-step
output appears in the logs of each `submit_rsvp` run under **Runs**.

## Photo albums (hidden)

Tapping a month's leaf photo opens that month's album, if it has one. Album files
(photos and short videos) live in `album/` and are listed in
`u/brianne/brixx_birthday.raw_app/albums.ts`; they're served from jsDelivr's GitHub
CDN pinned to the commit that added them, so they load only when an album is opened.

## Editing

- Wording on the leaf or form: `App.tsx`
- Colors and spacing: `index.css`
- What the email says: `backend/submit_rsvp.ts`
