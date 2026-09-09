/**
 * Cloudflare Worker: secure backend for the Nikkoplas website chatbot.
 * Uses Cloudflare Workers AI (env.AI binding) directly - no external API
 * key or third-party account needed, and it's free (10,000 neurons/day).
 * Only accepts requests from the configured site origin.
 */

const SYSTEM_PROMPT = `You are the website assistant for Industri Nikkoplas Sdn. Bhd. (Nikkoplas), a precision plastic injection moulding manufacturer in Johor Bahru, Malaysia.

Company facts you can rely on:
- Founded 1988, 35+ years of manufacturing experience. Legal name: Industri Nikkoplas Sdn. Bhd. (169818-D).
- ISO 9001:2015 (Quality Management) and ISO 14001:2015 (Environmental Management) certified.
- Address: 2B, Jalan Tampoi 2, Kawasan Perindustrian Tampoi, 81200 Johor Bahru, Johor, Malaysia (~8km from JB city centre, near the Singapore Causeway).
- Contact: Tel +607-237 0021, WhatsApp 016-760 2667, email bntee@nikkoplas.com. Office hours Mon-Fri 8:00am-5:30pm.
- Materials processed: PS, ABS, PC, PC/ABS blends, PP, PE, Nylon (PA6, PA66) and other engineering-grade thermoplastics.
- Machinery: injection moulding machines from 50T to 450T clamping force, for small-to-mid tonnage precision parts.
- Core capabilities: one-stop injection moulding & finishing with in-house painting, and small-to-mid tonnage precision moulding.
- In-house secondary processing / finishing services: spray painting (auto & semi-auto rotary), tempo printing (incl. 2-colour), pad printing, silk screen printing, hot stamping, and ultrasonic welding.
- Industries served: electronics, telecommunications and engineering OEMs — including connector housings and telecom enclosures.
- MOQ: for new tools, typically 1,000-5,000 pieces per run to cover tooling setup cost; smaller runs possible for customers with existing tools.
- DFM (Design for Manufacturability): an outsource partner performs DFM review (wall thickness, draft angles, gate locations, weld lines) and written feedback is provided with quotations.
- The website has pages for: About, Capabilities, Secondary Processes, Machinery, Portfolio, Certifications, Industries (electronics/telecom/engineering), and a Contact section on the homepage (/#contact).

Guidelines:
- Answer only using the facts above. If asked something you don't have facts for (e.g. exact pricing, lead times, specific part quotes), say you don't have that specific detail and direct them to contact the team via phone/WhatsApp/email for a precise answer.
- Keep answers short and conversational — 1-4 sentences, no markdown headers, plain text (light punctuation/line breaks are fine).
- When relevant, suggest which page of the site has more detail (e.g. "/capabilities/", "/secondary-processes/", "/certifications/", "/machinery/", "/portfolio/", "/about/", "/industries/electronics-telecom-engineering/").
- Stay strictly on topic: Nikkoplas, its products, services, and how to get in touch. Politely decline unrelated requests (general knowledge, coding help, etc.) and steer back to how you can help with Nikkoplas.
- Never invent certifications, prices, capacities, or capabilities not listed above.`;

const AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const MAX_MESSAGE_LEN = 800;
const MAX_HISTORY_TURNS = 8;

function corsHeaders(origin, allowedOrigin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin === allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }
  return headers;
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN;
    const cors = corsHeaders(origin, allowedOrigin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    if (allowedOrigin && origin !== allowedOrigin) {
      return json({ error: 'Origin not allowed' }, 403, cors);
    }

    if (!env.AI) {
      return json({ error: 'Server is not configured (missing AI binding).' }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Invalid JSON body' }, 400, cors);
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return json({ error: 'Missing "message"' }, 400, cors);
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return json({ error: `Message too long (max ${MAX_MESSAGE_LEN} characters)` }, 400, cors);
    }

    const trimmedHistory = history
      .filter((h) => h && (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
      .slice(-MAX_HISTORY_TURNS)
      .map((h) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.text.slice(0, MAX_MESSAGE_LEN),
      }));

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...trimmedHistory,
      { role: 'user', content: message },
    ];

    let aiResult;
    try {
      aiResult = await env.AI.run(AI_MODEL, {
        messages,
        max_tokens: 400,
        temperature: 0.4,
      });
    } catch (e) {
      return json({ error: 'AI service error', detail: String(e && e.message ? e.message : e).slice(0, 300) }, 502, cors);
    }

    const reply = (aiResult && aiResult.response ? aiResult.response : '').trim();

    if (!reply) {
      return json({ error: 'AI returned an empty response' }, 502, cors);
    }

    return json({ reply }, 200, cors);
  },
};
