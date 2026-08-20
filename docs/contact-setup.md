# Wiring up the contact form

The form in `#contact` posts JSON to a server-side route handler at
`/api/contact`, which hands the message to [Resend](https://resend.com) and
mails it to you. Without credentials the route answers `503` and the form shows
"the form isn't wired up yet — use the e-mail link instead". Nothing else on the
page breaks.

## 1. Create the Resend account

1. Sign up at <https://resend.com> — the free tier is 3,000 emails/month and
   100/day, which is roughly two orders of magnitude more than this form will
   ever see.
2. Go to **API Keys** → **Create API Key**. Give it **Sending access** only;
   this key never needs to read anything.
3. Copy the key (`re_…`). It's shown once.

## 2. Verify the sending domain

Resend will only send `from` an address on a domain you've proved you own.

1. **Domains** → **Add Domain** → `jaako.xyz`.
2. Resend prints three DNS records — an MX and two TXT (SPF and DKIM). Add them
   at whoever hosts the DNS for `jaako.xyz`.
3. Click **Verify**. Propagation is usually minutes, occasionally an hour.

The `from` address does **not** need a real mailbox behind it — `contact@` is
fine as a send-only sender. Replies go to whoever filled in the form, because
the route sets `Reply-To` to their address.

### Skipping this while you test

Resend gives every account a shared sender at `onboarding@resend.dev` that works
with no DNS setup at all. The catch: it can only deliver to the address you
signed up with. Good enough for local testing, not for production.

```sh
CONTACT_FROM_EMAIL="jaako.xyz <onboarding@resend.dev>"
```

## 3. Set the environment variables

In `.env.local` for local dev, and in the host's dashboard for the deployed
site:

```sh
RESEND_API_KEY=re_...
CONTACT_FROM_EMAIL="jaako.xyz <contact@jaako.xyz>"
CONTACT_TO_EMAIL=jaakoaandes@gmail.com
```

All three are required. If any is missing the route logs which ones and returns
503 — it never fails silently, because a contact form that swallows messages is
worse than one that admits it's broken.

## 4. Test it

```sh
pnpm dev
```

Fill the form at <http://localhost:3000/#contact>. A send takes about a second
and the panel flips to its "sent" state. Failures surface inline above the
button; the details land in the server console prefixed `[contact]`.

To exercise the route directly:

```sh
curl -s localhost:3000/api/contact \
  -H 'content-type: application/json' \
  -d '{"name":"test","email":"you@example.com","reason":"just saying hi","message":"hello"}'
```

## How the spam protection works

Two layers, both server-side — neither adds friction for a real visitor and
neither loads a third-party script.

**Honeypot.** The form renders a `website` field positioned off-screen and out
of the tab order. A human never sees it; a bot filling every input it finds
does. When it arrives non-empty the route returns `200 {"ok":true}` and drops
the message on the floor, so the bot logs a success and never learns to work
around it.

**Rate limit.** Three sends per IP per ten minutes, held in a `Map` in
`src/lib/contact.ts`. Deliberately in-memory: on a serverless host the map is
per-instance and resets on redeploy, which is fine, because the job is stopping
a script hammering the endpoint in one sitting rather than enforcing a real
quota. The IP comes from `x-forwarded-for`, which a determined sender can
rotate — the honeypot is what actually stops bots. If the site ever needs a real
limiter, swap the `hits` map for Redis; the call site won't change.

Validation is separate from either: name, e-mail and message must be present and
within length limits, the e-mail must be shaped like an address, and the reason
has to be one of the values in `src/data/contact.ts`.
