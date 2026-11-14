// Public project identifiers only. No API key or server credentials belong here.
import { Client } from './vendor/appwrite-29.1.0/client.js';

export const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6ade83ec00260198ae34');

// Google provider enabled in Console. Private file sync enabled after backend isolation and two-device tests.
export const cloudFeatures = Object.freeze({ googleLogin: true, sync: true });

let startup;
export let connectionStatus = Object.freeze({ state: 'idle' });
function report(state) {
  connectionStatus = Object.freeze({ state });
  const messages = {
    checking: 'Έλεγχος διαθεσιμότητας…',
    connected: 'Η υπηρεσία σύνδεσης είναι διαθέσιμη.',
    offline: 'Εκτός σύνδεσης. Η τοπική μελέτη παραμένει διαθέσιμη.',
    unavailable: 'Η υπηρεσία σύνδεσης δεν είναι διαθέσιμη. Η μελέτη συνεχίζεται τοπικά.'
  };
  document.querySelectorAll('[data-appwrite-status]').forEach(el => {
    el.textContent = messages[state];
  });
  window.dispatchEvent(new CustomEvent('ekab:appwrite-status', { detail: connectionStatus }));
  return connectionStatus;
}

// A single attempt per document, shared by every caller; no retries or study-data IO.
export function startAppwrite() {
  if (startup) return startup;
  startup = (async () => {
    if (navigator.onLine === false) return report('offline');
    report('checking');
    let timer;
    try {
      await Promise.race([
        client.ping(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 8000); })
      ]);
      return report('connected');
    } catch {
      // Do not log response bodies, tokens or any user data.
      return report('unavailable');
    } finally {
      clearTimeout(timer);
    }
  })();
  return startup;
}
