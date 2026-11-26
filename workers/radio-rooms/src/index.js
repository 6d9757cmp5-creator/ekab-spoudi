const CHANNELS = new Set(["voxal", "walkielazy", "walkie", "radio1", "private"]);
const ACTIONS = new Set(["state", "presence", "messages", "auth"]);

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});

function corsHeaders(origin, env) {
  if (origin !== env.ALLOWED_ORIGIN) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, X-Radio-Private",
    "access-control-max-age": "600",
    "vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const headers = corsHeaders(origin, env);
    if (!headers) return json({ error: "Η προέλευση δεν επιτρέπεται." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // Anonymous "who is on shift" counter for the home page: area only, no names, no IP stored.
    if (parts.length === 3 && parts[0] === "api" && parts[1] === "site" && parts[2] === "presence") {
      if (request.method !== "GET" && request.method !== "POST") return json({ error: "Μη υποστηριζόμενη μέθοδος." }, 405, headers);
      const shift = env.SITE.get(env.SITE.idFromName("global"));
      const internal = new Request("https://site.internal/presence", request);
      internal.headers.set("x-ekab-place", encodeURIComponent(placeOf(request.cf)));
      const result = await shift.fetch(internal);
      return new Response(result.body, { status: result.status, headers: { ...Object.fromEntries(result.headers), ...headers, "cache-control": "no-store" } });
    }
    if (parts.length !== 4 || parts[0] !== "api" || parts[1] !== "radio" ||
        !CHANNELS.has(parts[2]) || !ACTIONS.has(parts[3])) {
      return json({ error: "Η διαδρομή δεν βρέθηκε." }, 404, headers);
    }
    const [, , channel, action] = parts;
    if (action === "state" && request.method !== "GET") {
      return json({ error: "Μη υποστηριζόμενη μέθοδος." }, 405, headers);
    }
    if (action === "messages" && request.method !== "GET" && request.method !== "POST") {
      return json({ error: "Μη υποστηριζόμενη μέθοδος." }, 405, headers);
    }
    if ((action === "presence" || action === "auth") && request.method !== "POST") {
      return json({ error: "Μη υποστηριζόμενη μέθοδος." }, 405, headers);
    }
    const room = env.CHANNELS.get(env.CHANNELS.idFromName(channel));
    const internal = new URL("https://radio.internal/" + channel + "/" + action);
    internal.search = url.search;
    const forwarded = new Request(internal, request);
    const result = await room.fetch(forwarded);
    return new Response(result.body, {
      status: result.status,
      headers: { ...Object.fromEntries(result.headers), ...headers, "cache-control": "no-store" }
    });
  }
};

export class RadioChannel {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const [, channel, action] = new URL(request.url).pathname.split("/");
    if (!new Set(["state", "presence", "messages", "auth"]).has(action)) return json({ error: "Not found." }, 404);

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (!(await this.allowNetwork(ip))) return json({ error: "Πολλές γρήγορες αιτήσεις. Περίμενε λίγο." }, 429);

    let input = {};
    if (request.method === "POST") {
      if (Number(request.headers.get("content-length") || 0) > 4096) {
        return json({ error: "Το αίτημα είναι πολύ μεγάλο." }, 413);
      }
      let raw;
      try { raw = await request.text(); } catch { return json({ error: "Μη έγκυρο αίτημα." }, 400); }
      if (raw.length > 4096) return json({ error: "Το αίτημα είναι πολύ μεγάλο." }, 413);
      try { input = JSON.parse(raw); } catch { return json({ error: "Μη έγκυρο αίτημα." }, 400); }
      if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "Μη έγκυρο αίτημα." }, 400);
    }

    if (action === "auth") {
      if (channel !== "private") return json({ error: "Η διαδρομή δεν βρέθηκε." }, 404);
      return this.authorize(input, ip);
    }
    const privateAccess = await this.checkPrivate(channel, request);
    if (!privateAccess) return json({ error: "Απαιτείται έγκριση για το ιδιωτικό κανάλι." }, 401);

    if (action === "state") return this.state();
    if (action === "presence") return this.presence(input);
    return this.messages(request, input);
  }

  async allowNetwork(ip) {
    const key = "network:" + await this.digest(ip);
    const now = Date.now();
    const current = await this.ctx.storage.get(key) || { start: now, count: 0 };
    if (now - current.start >= 60_000) {
      await this.ctx.storage.put(key, { start: now, count: 1 });
      await this.scheduleExpiry();
      return true;
    }
    if (current.count >= 600) return false;
    current.count++;
    await this.ctx.storage.put(key, current);
    await this.scheduleExpiry();
    return true;
  }

  async digest(value) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(bytes)].slice(0, 12).map((item) => item.toString(16).padStart(2, "0")).join("");
  }

  async scheduleExpiry() {
    const deadlines = [];
    const state = await this.ctx.storage.get("channel");
    if (state?.participants) {
      for (const participant of Object.values(state.participants)) {
        if (participant?.lastSeen) deadlines.push(participant.lastSeen + 75_000);
      }
    }
    for (const message of await this.ctx.storage.get("messages") || []) deadlines.push(message.at + 86_400_000);
    for (const [, expires] of await this.ctx.storage.list({ prefix: "private-token:" })) deadlines.push(expires);
    for (const [, attempts] of await this.ctx.storage.list({ prefix: "auth-rate:" })) {
      for (const at of attempts) deadlines.push(at + 600_000);
    }
    for (const [, bucket] of await this.ctx.storage.list({ prefix: "network:" })) deadlines.push(bucket.start + 60_000);
    const next = Math.min(...deadlines.filter((deadline) => deadline > 0));
    if (Number.isFinite(next)) await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next));
    else await this.ctx.storage.deleteAlarm();
  }

  async readState() {
    const state = await this.ctx.storage.get("channel") || { roomCode: "", participants: {} };
    const now = Date.now();
    for (const [id, participant] of Object.entries(state.participants)) {
      if (!participant || participant.lastSeen < now - 75_000) delete state.participants[id];
    }
    if (!Object.keys(state.participants).length) state.roomCode = "";
    return state;
  }

  async saveState(state) {
    await this.ctx.storage.put("channel", state);
    await this.scheduleExpiry();
  }

  async state() {
    const state = await this.readState();
    await this.saveState(state);
    return json({ roomCode: state.roomCode || null, participants: Object.keys(state.participants).length });
  }

  async presence(input) {
    const participantId = typeof input.participantId === "string" ? input.participantId : "";
    const roomCode = typeof input.roomCode === "string" ? input.roomCode : "";
    const action = input.action;
    if (!/^[\w.-]{8,100}$/.test(participantId) || !/^[\w.:-]{3,100}$/.test(roomCode) ||
        !["joined", "heartbeat", "left", "migrate"].includes(action)) {
      return json({ error: "Μη έγκυρη ενημέρωση σύνδεσης." }, 400);
    }

    const state = await this.readState();
    const existing = state.participants[participantId];
    if (action === "joined" && state.roomCode && state.roomCode !== roomCode) {
      return json({ error: "Υπάρχει ενεργό δωμάτιο.", roomCode: state.roomCode }, 409);
    }
    if (action === "heartbeat" && (!existing || existing.roomCode !== roomCode)) {
      return json({ error: "Η σύνδεση έληξε. Συνδέσου ξανά." }, 409);
    }
    if (action === "migrate") {
      if (!existing) return json({ error: "Η σύνδεση έληξε. Συνδέσου ξανά." }, 409);
      state.roomCode = roomCode;
      for (const participant of Object.values(state.participants)) participant.roomCode = roomCode;
    }
    if (action === "left") {
      if (existing && existing.roomCode !== roomCode) return json({ error: "Η σύνδεση άλλαξε δωμάτιο." }, 409);
      delete state.participants[participantId];
      if (!Object.keys(state.participants).length) state.roomCode = "";
    } else {
      state.roomCode = roomCode;
      state.participants[participantId] = { roomCode, lastSeen: Date.now() };
    }
    await this.saveState(state);
    return json({ participants: Object.keys(state.participants).length, roomCode: state.roomCode || null });
  }

  async messages(request, input) {
    const now = Date.now();
    const saved = (await this.ctx.storage.get("messages") || []).filter((message) => message.at > now - 86_400_000).slice(-60);
    if (request.method === "GET") {
      const participantId = new URL(request.url).searchParams.get("participantId") || "";
      const state = await this.readState();
      if (!/^[\w.-]{8,100}$/.test(participantId) || !state.participants[participantId]) {
        return json({ error: "Συνδέσου στον ασύρματο για να δεις τα μηνύματα." }, 401);
      }
      return json({ messages: saved.map(({ id, sender, body }) => ({ id, sender, body })) });
    }

    const participantId = typeof input.participantId === "string" ? input.participantId : "";
    const text = typeof input.text === "string" ? input.text.trim() : "";
    const name = typeof input.name === "string" ? input.name.trim().slice(0, 32) : "";
    const state = await this.readState();
    if (!/^[\w.-]{8,100}$/.test(participantId) || !state.participants[participantId]) {
      return json({ error: "Συνδέσου ξανά στον ασύρματο πριν γράψεις." }, 401);
    }
    if (!text || text.length > 240 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      return json({ error: "Το μήνυμα πρέπει να έχει 1–240 χαρακτήρες." }, 400);
    }
    const rateKey = "message-rate:" + participantId;
    const recent = (await this.ctx.storage.get(rateKey) || []).filter((at) => at > now - 60_000);
    if (recent.length >= 12) return json({ error: "Περίμενε λίγο πριν στείλεις άλλο μήνυμα." }, 429);
    recent.push(now);
    await this.ctx.storage.put(rateKey, recent);
    const id = (await this.ctx.storage.get("message-sequence") || 0) + 1;
    await this.ctx.storage.put("message-sequence", id);
    saved.push({ id, sender: name || "Σπουδαστής", body: text, at: now });
    await this.ctx.storage.put("messages", saved.slice(-60));
    await this.scheduleExpiry();
    return json({ ok: true, id });
  }

  async authorize(input, ip) {
    const expected = this.env.PRIVATE_CHANNEL_CODE;
    if (typeof expected !== "string" || expected.length < 12) {
      return json({ error: "Η προστατευμένη υπηρεσία δεν ενεργοποιήθηκε. Δοκίμασε ξανά αργότερα." }, 503);
    }
    const attemptKey = "auth-rate:" + await this.digest(ip);
    const now = Date.now();
    const attempts = (await this.ctx.storage.get(attemptKey) || []).filter((at) => at > now - 600_000);
    if (attempts.length >= 6) return json({ error: "Πάρα πολλές προσπάθειες. Δοκίμασε αργότερα." }, 429);
    attempts.push(now);
    await this.ctx.storage.put(attemptKey, attempts);
    await this.scheduleExpiry();
    const supplied = typeof input.code === "string" ? input.code : "";
    let mismatch = supplied.length ^ expected.length;
    const length = Math.max(supplied.length, expected.length);
    for (let index = 0; index < length; index++) mismatch |= (supplied.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
    if (mismatch !== 0) return json({ error: "Ο κωδικός δεν εγκρίθηκε." }, 401);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await this.ctx.storage.put("private-token:" + token, now + 43_200_000);
    await this.scheduleExpiry();
    return json({ privateToken: token });
  }

  async checkPrivate(channel, request) {
    // Private access depends on successful code approval and a short-lived token.
    // Public channel instances never receive private tokens.
    if (channel !== "private") return true;
    const token = request.headers.get("x-radio-private");
    if (!token || token.length > 100) return false;
    const expires = await this.ctx.storage.get("private-token:" + token);
    if (!expires || expires < Date.now()) return false;
    return true;
  }

  async alarm() {
    const now = Date.now();
    const state = await this.readState();
    await this.ctx.storage.put("channel", state);
    const messages = await this.ctx.storage.get("messages");
    if (messages) await this.ctx.storage.put("messages", messages.filter((message) => message.at > now - 86_400_000).slice(-60));
    const keys = await this.ctx.storage.list({ prefix: "private-token:" });
    for (const [key, expires] of keys) if (expires < now) await this.ctx.storage.delete(key);
    for (const prefix of ["auth-rate:", "network:"]) {
      const rates = await this.ctx.storage.list({ prefix });
      for (const [key, value] of rates) {
        const recent = prefix === "auth-rate:" ? value.filter((at) => at > now - 600_000) :
          value.start > now - 60_000 ? value : null;
        if (recent?.length || (prefix === "network:" && recent)) await this.ctx.storage.put(key, recent);
        else await this.ctx.storage.delete(key);
      }
    }
    await this.scheduleExpiry();
  }
}

// Greek names for the areas Cloudflare reports; anything else is grouped as region or "Εκτός Ελλάδας".
const CITY_EL = {
  Heraklion: "Ηράκλειο", Chania: "Χανιά", Rethymno: "Ρέθυμνο", "Agios Nikolaos": "Άγιος Νικόλαος", Ierapetra: "Ιεράπετρα",
  Athens: "Αθήνα", Piraeus: "Πειραιάς", Peristeri: "Περιστέρι", Kallithea: "Καλλιθέα", Glyfada: "Γλυφάδα", Marousi: "Μαρούσι",
  Thessaloniki: "Θεσσαλονίκη", Patras: "Πάτρα", Larissa: "Λάρισα", Volos: "Βόλος", Ioannina: "Ιωάννινα", Kalamata: "Καλαμάτα",
  Rhodes: "Ρόδος", Corfu: "Κέρκυρα", Kavala: "Καβάλα", Serres: "Σέρρες", Alexandroupoli: "Αλεξανδρούπολη", Chalcis: "Χαλκίδα",
  Lamia: "Λαμία", Tripoli: "Τρίπολη", Kozani: "Κοζάνη", Komotini: "Κομοτηνή", Xanthi: "Ξάνθη", Drama: "Δράμα", Mytilene: "Μυτιλήνη"
};
const REGION_EL = {
  Crete: "Κρήτη", Attica: "Αττική", "Central Macedonia": "Κεντρική Μακεδονία", "Western Greece": "Δυτική Ελλάδα",
  Thessaly: "Θεσσαλία", Epirus: "Ήπειρος", Peloponnese: "Πελοπόννησος", "South Aegean": "Νότιο Αιγαίο", "North Aegean": "Βόρειο Αιγαίο",
  "Ionian Islands": "Ιόνια Νησιά", "Central Greece": "Στερεά Ελλάδα", "Western Macedonia": "Δυτική Μακεδονία",
  "Eastern Macedonia and Thrace": "Ανατολική Μακεδονία και Θράκη"
};
function placeOf(cf) {
  if (!cf || cf.country !== "GR") return cf?.country ? "Εκτός Ελλάδας" : "Άγνωστη περιοχή";
  return CITY_EL[cf.city] || REGION_EL[cf.region] || "Ελλάδα";
}

function decodePlace(value) {
  try { return value ? decodeURIComponent(value).slice(0, 40) : "Ελλάδα"; } catch { return "Ελλάδα"; }
}

export class SitePresence {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.seen = new Map();
    this.hits = new Map();
  }

  async fetch(request) {
    const now = Date.now();
    for (const [id, entry] of this.seen) if (now - entry.at > 90_000) this.seen.delete(id);
    if (request.method === "POST") {
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const hit = this.hits.get(ip);
      if (hit && now - hit.start < 60_000 && hit.count >= 30) return json({ error: "Πολλές γρήγορες αιτήσεις." }, 429);
      this.hits.set(ip, hit && now - hit.start < 60_000 ? { start: hit.start, count: hit.count + 1 } : { start: now, count: 1 });
      if (this.hits.size > 5000) this.hits.clear();
      let input;
      try { input = JSON.parse((await request.text()).slice(0, 512)); } catch { return json({ error: "Μη έγκυρο αίτημα." }, 400); }
      const id = typeof input?.id === "string" && /^[a-z0-9]{16,40}$/.test(input.id) ? input.id : null;
      if (!id) return json({ error: "Μη έγκυρο αίτημα." }, 400);
      if (input.leave === true) this.seen.delete(id);
      else if (this.seen.size < 20_000 || this.seen.has(id)) this.seen.set(id, { at: now, place: decodePlace(request.headers.get("x-ekab-place")) });
    }
    const places = {};
    for (const { place } of this.seen.values()) places[place] = (places[place] || 0) + 1;
    return json({ total: this.seen.size, places: Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 8) });
  }
}
