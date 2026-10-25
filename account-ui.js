import { client, cloudFeatures } from './appwrite-client.js?app=27.1.32';
import { Account } from './vendor/appwrite-29.1.0/account.js';

const account = new Account(client);
let user = null;
let initialized = false;

// Keep return URLs on this installation, including the GitHub Pages subdirectory.
export function loginWithGoogle() {
  if (!cloudFeatures.googleLogin) throw new Error('google-not-configured');
  const success = new URL('./index.html?login=success', import.meta.url).href;
  const failure = new URL('./index.html?login=failed', import.meta.url).href;
  return account.createOAuth2Session({ provider: 'google', success, failure });
}

export function initAccountUI() {
  if (initialized) return;
  initialized = true;
  let trigger = document.querySelector('[data-account-open]');
  if (!trigger) {
    const host = document.querySelector('.header-row .utility, .top .utility');
    if (!host) return;
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'account-button';
    trigger.setAttribute('data-account-open', '');
    trigger.textContent = 'Σύνδεση';
    host.prepend(trigger);
  }
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'accountDialog');
  trigger.disabled = false;
  const dialog = document.createElement('dialog');
  dialog.id = 'accountDialog';
  dialog.setAttribute('aria-labelledby', 'accountTitle');
  dialog.innerHTML = `<div class="dialog-inner account-dialog">
    <div class="account-dialog-heading"><h2 id="accountTitle">Ο λογαριασμός σου</h2><button class="dialog-close" type="button" aria-label="Κλείσιμο λογαριασμού">×</button></div>
    <p data-account-message></p>
    <button class="btn google-signin full" type="button" data-google-login><span class="google-mark" aria-hidden="true">G</span>Συνέχεια με Google</button>
    <button class="btn secondary full" type="button" data-account-logout hidden>Αποσύνδεση</button>
    <p class="account-local-note">Η πρόοδος και τα PDF παραμένουν στη συσκευή σου. Ο συγχρονισμός μεταξύ συσκευών δεν είναι ακόμη διαθέσιμος.</p>
    <p class="small muted" data-appwrite-status role="status" aria-live="polite"></p>
  </div>`;
  document.body.append(dialog);
  const message = dialog.querySelector('[data-account-message]');
  const login = dialog.querySelector('[data-google-login]');
  const logout = dialog.querySelector('[data-account-logout]');
  function paint() {
    trigger.textContent = user ? 'Λογαριασμός' : 'Σύνδεση';
    login.hidden = Boolean(user);
    login.disabled = !cloudFeatures.googleLogin;
    logout.hidden = !user;
    message.textContent = user
      ? 'Έχεις συνδεθεί ως ' + (user.name || user.email || 'χρήστης') + '.'
      : cloudFeatures.googleLogin
        ? 'Συνδέσου με τον λογαριασμό σου Google.'
        : 'Η σύνδεση Google είναι σε προετοιμασία. Μπορείς να συνεχίσεις κανονικά τη μελέτη σου χωρίς λογαριασμό.';
  }
  trigger.addEventListener('click', () => { paint(); dialog.showModal(); });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  login.addEventListener('click', async () => {
    login.disabled = true;
    try { await loginWithGoogle(); }
    catch { message.textContent = 'Η σύνδεση δεν ολοκληρώθηκε. Δοκίμασε ξανά αργότερα.'; login.disabled = !cloudFeatures.googleLogin; }
  });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await account.deleteSession({ sessionId: 'current' }); user = null; paint(); }
    catch { message.textContent = 'Η αποσύνδεση δεν ολοκληρώθηκε. Έλεγξε τη σύνδεσή σου.'; }
    finally { logout.disabled = false; }
  });
  paint();
  // No session request until the provider is configured; never create guest users.
  if (cloudFeatures.googleLogin && navigator.onLine !== false) {
    account.get().then(value => { user = value; paint(); }).catch(() => {});
    const params = new URL(location.href).searchParams;
    if (params.get('login') === 'failed') {
      message.textContent = 'Η σύνδεση Google ακυρώθηκε ή απέτυχε. Η τοπική σου πρόοδος δεν επηρεάστηκε.';
      dialog.showModal();
    }
  }
  document.querySelectorAll('.file-select input[type="file"]').forEach(input => {
    input.addEventListener('change', () => {
      input.closest('.file-select').querySelector('[data-file-label]').textContent = input.files?.[0]?.name || 'Δεν έχει επιλεγεί αρχείο';
    });
  });
}
