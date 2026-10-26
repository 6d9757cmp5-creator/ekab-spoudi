// Run: node --experimental-vm-modules scripts/verify-appwrite.mjs
// Uses the real vendored SDK, with a fake transport; never contacts production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function setup({ online = true, transport = async () => new Response('Pong!') } = {}) {
  const calls = [], events = [], timers = new Map(), status = { textContent: '' };
  let nextTimer = 0;
  const context = vm.createContext({
    URL, URLSearchParams, Headers, Response, FormData, Blob, File, ArrayBuffer,
    navigator: { onLine: online },
    document: { querySelectorAll: () => [status] },
    window: {
      localStorage: {
        getItem(key) { assert.equal(key, 'cookieFallback'); return null; },
        setItem() { assert.fail('No local writes during ping'); }
      },
      dispatchEvent(event) { events.push(event.detail.state); }
    },
    CustomEvent: class { constructor(type, data) { this.type = type; this.detail = data.detail; } },
    console,
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (...args) => { calls.push(args); return transport(...args); }
  });
  const modules = new Map();
  async function load(url) {
    if (modules.has(url.href)) return modules.get(url.href);
    const module = new vm.SourceTextModule(await readFile(url, 'utf8'), { context, identifier: url.href });
    modules.set(url.href, module);
    await module.link((specifier, parent) => load(new URL(specifier, parent.identifier)));
    return module;
  }
  const module = await load(new URL('../appwrite-client.js', import.meta.url));
  await module.evaluate();
  return { api: module.namespace, calls, events, timers, status };
}

const success = await setup();
const first = success.api.startAppwrite();
assert.equal(first, success.api.startAppwrite());
assert.equal((await first).state, 'connected');
assert.equal(success.calls.length, 1);
const [url, options] = success.calls[0];
assert.equal(String(url), 'https://fra.cloud.appwrite.io/v1/ping');
assert.equal(options.method.toUpperCase(), 'GET');
const headers = new Headers(options.headers);
assert.equal(headers.get('X-Appwrite-Project'), '6ade83ec00260198ae34');
assert.equal(headers.has('X-Appwrite-Key'), false);
assert.equal(options.body, undefined);
assert.equal(success.api.cloudFeatures.googleLogin, true);
assert.equal(success.api.cloudFeatures.sync, true);
assert.equal(success.timers.size, 0);
await success.api.startAppwrite();
assert.equal(success.calls.length, 1);

const offline = await setup({ online: false });
assert.equal((await offline.api.startAppwrite()).state, 'offline');
assert.equal(offline.calls.length, 0);

for (const transport of [
  async () => { throw new TypeError('Network/CORS failure'); },
  async () => new Response(JSON.stringify({ message: 'denied' }), { status: 403, headers: { 'content-type': 'application/json' } })
]) {
  const failed = await setup({ transport });
  assert.equal((await failed.api.startAppwrite()).state, 'unavailable');
  await failed.api.startAppwrite();
  assert.equal(failed.calls.length, 1);
  assert.equal(failed.timers.size, 0);
}

let finish;
const delayed = await setup({ transport: () => new Promise(resolve => { finish = resolve; }) });
const pending = delayed.api.startAppwrite();
for (const expire of delayed.timers.values()) expire();
assert.equal((await pending).state, 'unavailable');
finish(new Response('Pong!'));
await new Promise(resolve => setImmediate(resolve));
assert.equal(delayed.api.connectionStatus.state, 'unavailable');
assert.equal(delayed.calls.length, 1);
assert.equal(delayed.timers.size, 0);
console.log('Appwrite: real SDK request, one ping, offline, network/CORS, HTTP denial, timeout, no data upload or local writes: passed.');
