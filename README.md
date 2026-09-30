# Brixx's 1st birthday — invitation & RSVP

The kalo-leaf invitation as a web page, hosted on Windmill. Guests tap the leaf to
turn it over for the details, then RSVP on the same page. Each RSVP is saved to a
Windmill data table and emails you the reply plus the running totals.

Deploys automatically on every push to `main`.

## What's in here

```
u/brianne/brixx_birthday.raw_app/     ← the Windmill app (path u/brianne/brixx_birthday)
  raw_app.yaml                        ← public, custom URL "brixx-turns-one", data table access
  index.tsx, App.tsx, index.css       ← the page (React)
  leaf.ts                             ← the exact leaf outline + veins from the printed card
  backend/submit_rsvp.ts              ← saves the RSVP, emails you
  sql_to_apply/*.sql                  ← creates the rsvps table (run once, see step 1)
wmill.yaml                            ← limits `wmill sync push` to this app only
.github/workflows/deploy.yml          ← build check + deploy on push to main
```

Guest answers are stored in `brixx_birthday.rsvps`. If someone RSVPs again with the
same name, both rows are kept and the totals use their latest answer.

## One-time setup

### 1. Data table

In Windmill: **Workspace settings → Data Tables**. Make sure one named `main`
exists (create it if the list is empty).

Then create the RSVP table by running the two files in
`u/brianne/brixx_birthday.raw_app/sql_to_apply/`, in order, against `main`:

- **From your computer:** `cd u/brianne/brixx_birthday.raw_app && npm install && wmill app dev .`
  The dev server notices the SQL files and asks you to apply them.
- **Or in Windmill:** open the `main` data table's SQL explorer and paste
  `000_create_schema.sql`, then `001_create_rsvps.sql`.

After that, you can view every RSVP in the data table viewer.

### 2. Email (Gmail app password)

1. Google Account → Security → turn on **2-Step Verification** (required for app passwords).
2. Google Account → search **App passwords** → create one called "Windmill RSVP". Copy the 16-character password.
3. In Windmill → **Resources → + Resource**, type **smtp**, saved at path `u/brianne/rsvp_smtp`:
   - host `smtp.gmail.com`, port `465`
   - user: your Gmail address
   - password: the app password from step 2
4. In Windmill → **Variables → + Variable** at path `u/brianne/rsvp_notify_email`:
   the address that should receive RSVP emails.

Neither the password nor your address is stored in this repo.

### 3. GitHub secrets

Repo → Settings → Secrets and variables → Actions. Same values as `ugc-portfolio`:

- `WM_BASE_URL` e.g. `https://app.windmill.dev`
- `WM_WORKSPACE` your workspace id
- `WM_TOKEN` a Windmill token that can deploy apps

### 4. Deploy

Push to `main`, or run **Deploy to Windmill** from the Actions tab. When it's done,
open the app in Windmill to copy its public link (it uses the custom path
`brixx-turns-one`), and point the QR code at that link.

## Editing

- Wording on the leaf or form: `App.tsx`
- Colors and spacing: `index.css`
- What the email says: `backend/submit_rsvp.ts`
