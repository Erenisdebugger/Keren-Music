/**
 * Keren Wave — Application Emoji Manager
 *
 * Uploads Twemoji PNG assets directly to the Discord API as Application Emojis
 * (tied to the bot itself — work in every server, no extra server required).
 * IDs are cached to src/emoji_cache.json so uploads only happen once.
 *
 * Uses client.rest.post() directly with base64 data URIs, bypassing discord.js's
 * internal image resolver which does not reliably accept Buffers in this env.
 */

const fs   = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../emoji_cache.json');
const CDN_BASE   = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72';

// emoji name → Twemoji hex codepoint (Twemoji filenames strip variation selectors)
const EMOJI_DEFS = {
  kw_check:   '2705',    // ✅
  kw_cross:   '274c',    // ❌
  kw_info:    '2139',    // ℹ️
  kw_warn:    '26a0',    // ⚠️
  kw_play:    '25b6',    // ▶️
  kw_pause:   '23f8',    // ⏸️
  kw_stop:    '23f9',    // ⏹️
  kw_skip:    '23ed',    // ⏭️
  kw_prev:    '23ee',    // ⏮️
  kw_like:    '2764',    // ❤️
  kw_shuffle: '1f500',   // 🔀
  kw_loop:    '1f501',   // 🔁
  kw_vol:     '1f50a',   // 🔊
  kw_note:    '1f3b5',   // 🎵
  kw_wave:    '1f30a',   // 🌊
  kw_crown:   '1f451',   // 👑
  kw_party:   '1f389',   // 🎉
  kw_clock:   '23f1',    // ⏱️
  kw_load:    '23f3',    // ⏳
  kw_queue:   '1f4cb',   // 📋
  kw_star:    '2b50',    // ⭐
  kw_user:    '1f464',   // 👤
  kw_music:   '1f3b6',   // 🎶
  kw_headset: '1f3a7',   // 🎧
};

// Unicode fallbacks — used when uploads are unavailable
const UNICODE = {
  kw_check:   '✅',  kw_cross:   '❌',  kw_info:    'ℹ️',
  kw_warn:    '⚠️',  kw_play:    '▶️',  kw_pause:   '⏸️',
  kw_stop:    '⏹️',  kw_skip:    '⏭️',  kw_prev:    '⏮️',
  kw_like:    '❤️',  kw_shuffle: '🔀',  kw_loop:    '🔁',
  kw_vol:     '🔊',  kw_note:    '🎵',  kw_wave:    '🌊',
  kw_crown:   '👑',  kw_party:   '🎉',  kw_clock:   '⏱️',
  kw_load:    '⏳',  kw_queue:   '📋',  kw_star:    '⭐',
  kw_user:    '👤',  kw_music:   '🎶',  kw_headset: '🎧',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Download a PNG from Twemoji CDN and return it as a base64 data URI.
 * This format is what the Discord REST API accepts for emoji images.
 */
async function fetchAsDataURI(codepoint) {
  const url = `${CDN_BASE}/${codepoint}.png`;
  const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`CDN HTTP ${res.status} for ${codepoint}`);
  const buf  = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/**
 * Upload one emoji directly via Discord REST API (bypasses discord.js resolveImage).
 * Returns the raw emoji object from the API response.
 */
async function uploadEmojiREST(client, name, dataURI) {
  return client.rest.post(
    `/applications/${client.application.id}/emojis`,
    { body: { name, image: dataURI } }
  );
}

/**
 * Fetch existing app emojis via REST (returns array of raw emoji objects).
 */
async function fetchExistingREST(client) {
  const data = await client.rest.get(`/applications/${client.application.id}/emojis`);
  // Discord returns { items: [...] } for application emojis
  return Array.isArray(data?.items) ? data.items : [];
}

async function initAppEmojis(client) {
  // ── 1. Load from disk cache ─────────────────────────────────────────────────
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cached     = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const customCount = Object.values(cached).filter(v => v.startsWith('<:')).length;
      if (customCount > 0) {
        applyToClient(client, cached);
        client.logger.log(`App emojis loaded from cache (${customCount} custom)`, 'ready');
        return;
      }
    } catch (_) {}
  }

  client.logger.log('Uploading Keren Wave Application Emojis…', 'ready');

  // ── 2. Fetch already-uploaded emojis from Discord ───────────────────────────
  const existing = new Map();
  try {
    const list = await fetchExistingREST(client);
    for (const e of list) existing.set(e.name, e);
    if (existing.size) client.logger.log(`${existing.size} app emojis already exist`, 'ready');
  } catch (err) {
    client.logger.log(`Could not fetch app emojis: ${err.message} — falling back to Unicode`, 'warn');
    return;
  }

  const result = {};

  // Map existing ones straight into result
  for (const name of Object.keys(EMOJI_DEFS)) {
    if (existing.has(name)) {
      const e = existing.get(name);
      result[name] = `<:${e.name}:${e.id}>`;
    }
  }

  // ── 3. Upload missing emojis ────────────────────────────────────────────────
  const missing = Object.entries(EMOJI_DEFS).filter(([n]) => !result[n]);
  if (missing.length > 0) {
    client.logger.log(`Uploading ${missing.length} emojis (≈${Math.ceil(missing.length)}s)…`, 'ready');

    for (const [name, codepoint] of missing) {
      try {
        const dataURI = await fetchAsDataURI(codepoint);
        const created = await uploadEmojiREST(client, name, dataURI);
        result[name]  = `<:${name}:${created.id}>`;
        await sleep(800); // ~1.2/s — stay within rate limit
      } catch (err) {
        const msg = err?.rawError?.message ?? err?.message ?? String(err);
        client.logger.log(`Skip ${name}: ${msg}`, 'warn');
        result[name] = UNICODE[name];
      }
    }
  }

  // Fill remaining with Unicode fallbacks
  for (const name of Object.keys(EMOJI_DEFS)) {
    if (!result[name]) result[name] = UNICODE[name];
  }

  // ── 4. Cache and apply ──────────────────────────────────────────────────────
  const customCount = Object.values(result).filter(v => v.startsWith('<:')).length;
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2), 'utf8'); } catch (_) {}

  applyToClient(client, result);
  client.logger.log(
    `App emojis ready — ${customCount} custom, ${Object.keys(result).length - customCount} Unicode fallback`,
    'ready'
  );
}

/**
 * Writes kw_* values onto client.emoji keys so all existing command code
 * picks up the custom emoji strings transparently — no changes needed anywhere else.
 */
function applyToClient(client, map) {
  const MAP = {
    check: 'kw_check',    cross:    'kw_cross',   info:     'kw_info',
    warn:  'kw_warn',     play:     'kw_play',    pause:    'kw_pause',
    stop:  'kw_stop',     skip:     'kw_skip',    previous: 'kw_prev',
    like:  'kw_like',     shuffle:  'kw_shuffle', loop:     'kw_loop',
    volup: 'kw_vol',      note:     'kw_note',    wave:     'kw_wave',
    owner: 'kw_crown',    gwy:      'kw_party',   duration: 'kw_clock',
    load:  'kw_load',     spotify:  'kw_headset', ytmusic:  'kw_music',
    dance: 'kw_music',    user:     'kw_user',    star:     'kw_star',
    queue: 'kw_queue',    headset:  'kw_headset',
  };

  for (const [clientKey, appKey] of Object.entries(MAP)) {
    if (map[appKey]) client.emoji[clientKey] = map[appKey];
  }

  client.appEmoji = map; // also expose the raw kw_ map
}

module.exports = { initAppEmojis, UNICODE };
