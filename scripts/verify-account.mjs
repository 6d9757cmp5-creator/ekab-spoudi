// Exercise the real Account SDK without contacting Google or Appwrite.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function accountModule(enabled) {
  const browserLocation = { href: '' };
  const context = vm.createContext({ URL, window: { location: browserLocation } });
  const config = { endpoint: 'https://fra.cloud.appwrite.io/v1', project: '6ade83ec00260198ae34' };
  const publicClient = new vm.SyntheticModule(['client', 'cloudFeatures'], function () {
    this.setExport('client', { config });
    this.setExport('cloudFeatures', Object.freeze({ googleLogin: enabled, sync: false }));
  }, { context });
  const modules = new Map();
  async function load(url) {
    if (url.pathname.endsWith('/appwrite-client.js')) return publicClient;
    if (modules.has(url.href)) return modules.get(url.href);
    const relative = url.pathname.replace('/ekab-spoudi/', '');
    const source = await readFile(new URL('../' + relative, import.meta.url), 'utf8');
    const module = new vm.SourceTextModule(source, {
      context, identifier: url.href,
      initializeImportMeta(meta) { meta.url = url.href; }
    });
    modules.set(url.href, module);
    await module.link((path, parent) => load(new URL(path, parent.identifier)));
    return module;
  }
  const module = await load(new URL('https://example.test/ekab-spoudi/account-ui.js'));
  await module.evaluate();
  return { api: module.namespace, browserLocation };
}

const disabled = await accountModule(false);
assert.throws(() => disabled.api.loginWithGoogle(), /google-not-configured/);
assert.equal(disabled.browserLocation.href, '');
const enabled = await accountModule(true);
await enabled.api.loginWithGoogle();
const url = new URL(enabled.browserLocation.href);
assert.equal(url.origin, 'https://fra.cloud.appwrite.io');
assert.equal(url.pathname, '/v1/account/tokens/oauth2/google');
assert.equal(url.searchParams.get('project'), '6ade83ec00260198ae34');
assert.equal(url.searchParams.get('success'), 'https://example.test/ekab-spoudi/oauth-callback.html');
assert.equal(url.searchParams.get('failure'), 'https://example.test/ekab-spoudi/index.html?login=failed');
assert.equal(url.searchParams.has('scopes'), false);
assert.equal(url.searchParams.has('key'), false);
console.log('Account: disabled provider cannot redirect; configured SDK uses Google, fixed same-installation URLs and no additional scopes: passed.');

const { finishOAuthReturn } = await import('../oauth-return.js');
const calls = [];
await finishOAuthReturn({
  href: 'https://example.test/ekab-spoudi/oauth-callback.html?userId=test-user&secret=one-time-test#fragment',
  clearAddress(href) { calls.push(['scrub', href]); },
  async createSession(data) { calls.push(['session', data]); },
  async getUser() { calls.push(['verify']); return { $id: 'test-user' }; }
});
assert.equal(calls[0][0], 'scrub');
assert.equal(calls[0][1], 'https://example.test/ekab-spoudi/oauth-callback.html');
assert.equal(calls[1][1].secret, 'one-time-test');
assert.equal(calls[2][0], 'verify');
for (const query of ['', '?userId=a', '?userId=a&secret=b&secret=c']) {
  let scrubbed = false;
  await assert.rejects(finishOAuthReturn({
    href: 'https://example.test/oauth-callback.html' + query,
    clearAddress() { scrubbed = true; },
    createSession() { assert.fail('Malformed callback must not create a session'); },
    getUser() { assert.fail('Malformed callback must not request user data'); }
  }));
  assert.equal(scrubbed, true);
}
await assert.rejects(finishOAuthReturn({
  href: 'https://example.test/oauth-callback.html?userId=a&secret=b',
  clearAddress() {}, async createSession() {}, async getUser() { return { $id: 'other' }; }
}), /session-not-confirmed/);
const listeners = {};
const workerContext = vm.createContext({ URL, self: {
  location: { origin: 'https://example.test' },
  addEventListener(type, handler) { listeners[type] = handler; }
} });
vm.runInContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), workerContext);
for (const path of ['/ekab-spoudi/oauth-callback.html', '/index.html?secret=test', '/index.html?userId=test']) {
  listeners.fetch({ request: { method: 'GET', url: 'https://example.test' + path }, respondWith() { assert.fail('OAuth callbacks must bypass the offline cache'); } });
}
console.log('OAuth return: scrub before network, consume once, verify identity, reject malformed returns, exclude credential URLs from service worker: passed.');
