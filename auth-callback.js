import { client } from './appwrite-client.js?app=27.1.65';
import { Account } from './vendor/appwrite-29.1.0/account.js';
import { finishOAuthReturn } from './oauth-return.js';

const account = new Account(client);
finishOAuthReturn({
  href: location.href,
  clearAddress: href => history.replaceState(null, '', href),
  createSession: data => account.createSession(data),
  getUser: () => account.get()
}).then(() => {
  location.replace(new URL('./index.html?login=success', import.meta.url).href);
}).catch(() => {
  document.getElementById('authStatus').textContent = 'Η σύνδεση δεν ολοκληρώθηκε. Επέστρεψε στην εφαρμογή και δοκίμασε ξανά. Η τοπική πρόοδός σου δεν επηρεάστηκε.';
});
