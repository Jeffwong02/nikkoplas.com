# Nikkoplas chatbot backend (Cloudflare Worker → Google Gemini)

This is the secure backend for the chat widget on the website. It exists
because the website itself is static (GitHub Pages) and can't hold a secret
API key in the browser — this Worker holds the Gemini key server-side and
the browser only ever talks to the Worker.

Cost: Cloudflare Workers free tier (100,000 requests/day) + Google Gemini
free tier (`gemini-2.0-flash`, generous free rate limits) — $0/month for
this site's expected traffic.

## One-time setup

1. **Get a free Gemini API key**
   Go to https://aistudio.google.com/app/apikey, sign in with a Google
   account, and click "Create API key". Copy it — you'll paste it in step 4.

2. **Install the Cloudflare CLI (wrangler)** and log in
   ```bash
   cd chatbot-worker
   npm install -g wrangler
   npx wrangler login
   ```
   This opens a browser to log into (or create) a free Cloudflare account.

3. **Check `wrangler.toml`**
   `ALLOWED_ORIGIN` is set to `https://www.industrinikkoplas.com`. Update it
   if your live domain differs — this is the only origin the Worker will
   accept chat requests from.

4. **Add the Gemini key as a secret** (never goes into git or wrangler.toml)
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```
   Paste the key from step 1 when prompted.

5. **Deploy**
   ```bash
   npx wrangler deploy
   ```
   Wrangler prints a URL like `https://nikkoplas-chatbot.<your-subdomain>.workers.dev`.
   Copy it.

6. **Point the website at your Worker**
   Open `/chatbot.js` in the repo root and set:
   ```js
   var CHAT_ENDPOINT = 'https://nikkoplas-chatbot.<your-subdomain>.workers.dev';
   ```
   Commit and push. The chat widget will now call Gemini through your Worker.
   (Until this is set, the widget quietly falls back to its built-in FAQ
   matching, so the site never breaks.)

## Updating later

Edit `src/index.js` (e.g. to add more company facts to `SYSTEM_INSTRUCTION`)
then redeploy with `npx wrangler deploy` — no need to touch secrets again.

## Local testing

```bash
npx wrangler dev
```
This starts the Worker locally (usually at `http://localhost:8787`) using
your secret. Temporarily point `CHAT_ENDPOINT` at that local URL (and add
`http://localhost:8787` style origin to `ALLOWED_ORIGIN`, or serve the site
from `http://localhost` with `python3 -m http.server`) to test end-to-end
before deploying.
