# Nikkoplas chatbot backend (Cloudflare Worker + Workers AI)

This is the secure backend for the chat widget on the website. It exists
because the website itself is static (GitHub Pages) and can't hold a secret
API key or run a model directly in the browser — this Worker does that
server-side, and the browser only ever talks to the Worker.

It uses **Cloudflare Workers AI** (`env.AI` binding) to run the model
directly inside the Worker — no external API key, no separate account, no
billing setup. Free tier: 10,000 neurons/day, which comfortably covers a
low-traffic company site.

## Deploying via the Cloudflare dashboard (no CLI needed)

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** →
   start from a blank/"Hello World" Worker, name it (e.g. `nikkoplas-chatbot`).
2. Open **Edit code**, delete the placeholder code, and paste in the full
   contents of `src/index.js` from this folder. Save and deploy.
3. Go to the Worker's **Settings** tab:
   - **Variables and Secrets** → add `ALLOWED_ORIGIN` = `https://www.industrinikkoplas.com` (plain text)
   - **Bindings** → add a **Workers AI** binding named `AI` (this is what
     `env.AI` in the code refers to — without it the Worker returns a 500)
4. Copy the Worker's URL (shown at the top of its page, looks like
   `https://nikkoplas-chatbot.<your-subdomain>.workers.dev`)
5. Set that URL as `CHAT_ENDPOINT` in `/chatbot.js` (repo root), commit, push.

## Deploying via the CLI instead

```bash
cd chatbot-worker
npx wrangler login
npx wrangler deploy
```
`wrangler.toml` already declares the `AI` binding and `ALLOWED_ORIGIN`, so
no secrets need to be set — deploy is a single command.

## Updating later

Edit `src/index.js` (e.g. to add more company facts to `SYSTEM_PROMPT`, or
change `AI_MODEL` to a different Workers AI model) then redeploy the same
way you deployed initially (paste into the dashboard editor, or
`npx wrangler deploy`).

## Local testing

```bash
npx wrangler dev
```
Starts the Worker locally (usually at `http://localhost:8787`), with a
local Workers AI binding. Temporarily point `CHAT_ENDPOINT` at that local
URL to test end-to-end before deploying.
