import { client, cloudFeatures } from './appwrite-client.js?app=27.1.68';
import { Account } from './vendor/appwrite-29.1.0/account.js';

const account = new Account(client);
let user = null;
let initialized = false;

// Keep return URLs on this installation, including the GitHub Pages subdirectory.
export function loginWithGoogle() {
  if (!cloudFeatures.googleLogin) throw new Error('google-not-configured');
  const success = new URL('./oauth-callback.html', import.meta.url).href;
  const failure = new URL('./index.html?login=failed', import.meta.url).href;
  return account.createOAuth2Token({ provider: 'google', success, failure });
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
  let syncManager = null;
  dialog.id = 'accountDialog';
  dialog.setAttribute('aria-labelledby', 'accountTitle');
  dialog.innerHTML = `<div class="dialog-inner account-dialog">
    <div class="account-dialog-heading"><h2 id="accountTitle">Ο λογαριασμός σου</h2><button class="dialog-close" type="button" aria-label="Κλείσιμο λογαριασμού">×</button></div>
    <p data-account-message></p>
    <button class="btn google-signin full" type="button" data-google-login><span class="google-mark" aria-hidden="true">G</span>Συνέχεια με Google</button>
    <button class="btn secondary full" type="button" data-account-logout hidden>Αποσύνδεση</button>
    <section class="cloud-controls" data-cloud-controls hidden><h3>Συγχρονισμός συσκευών</h3>
      <p data-cloud-status role="status" aria-live="polite">Έλεγχος συγχρονισμού…</p>
      <div class="actions"><button class="btn compact" data-sync-enable type="button">Ενεργοποίηση σε αυτή τη συσκευή</button><button class="btn compact" data-sync-now type="button" hidden>Συγχρονισμός τώρα</button><button class="btn compact secondary" data-sync-pause type="button" hidden>Παύση</button></div>
      <p class="small muted">Πρόοδος ΕΟΠΠΕΠ/ΣΑΕΚ, σημειώσεις, PDF και ρυθμίσεις. Ιδιωτικά στον λογαριασμό σου. Δωρεάν όριο: 50 MB ανά PDF.</p>
      <button class="btn compact ghost" data-sync-recover type="button">Ανάκτηση τοπικού αντιγράφου</button>
    </section>
    <p class="account-local-note">Η τοπική αποθήκευση παραμένει ενεργή. Ο συγχρονισμός ενεργοποιείται ξεχωριστά σε κάθε συσκευή και συνεχίζει όταν επιστρέψει το internet.</p>
    <p class="small muted" data-appwrite-status role="status" aria-live="polite"></p>
  </div>`;
  document.body.append(dialog);
  const message = dialog.querySelector('[data-account-message]');
  const login = dialog.querySelector('[data-google-login]');
  const logout = dialog.querySelector('[data-account-logout]');
  async function attachSync() {
    if(!user||!cloudFeatures.sync||syncManager)return;
    const panel=dialog.querySelector('[data-cloud-controls]');panel.hidden=false;
    try {
      const { initCloudSync }=await import('./cloud-sync.js?app=27.1.68');
      syncManager=await initCloudSync({user,status:panel.querySelector('[data-cloud-status]'),enableButton:panel.querySelector('[data-sync-enable]'),nowButton:panel.querySelector('[data-sync-now]'),pauseButton:panel.querySelector('[data-sync-pause]'),recoverButton:panel.querySelector('[data-sync-recover]')});
    }catch { panel.querySelector('[data-cloud-status]').textContent='Ο συγχρονισμός δεν είναι διαθέσιμος. Η τοπική αποθήκευση συνεχίζεται.'; }
  }
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
    try { syncManager?.stop(); syncManager=null; await account.deleteSession({ sessionId: 'current' }); user = null; dialog.querySelector('[data-cloud-controls]').hidden=true; paint(); }
    catch { message.textContent = 'Η αποσύνδεση δεν ολοκληρώθηκε. Έλεγξε τη σύνδεσή σου.'; }
    finally { logout.disabled = false; }
  });
  paint();
  // No session request until the provider is configured; never create guest users.
  if (cloudFeatures.googleLogin && navigator.onLine !== false) {
    const params = new URL(location.href).searchParams;
    if (params.has('login')) {
      const clean = new URL(location.href);
      clean.searchParams.delete('login');
      history.replaceState(null, '', clean.href);
    }
    account.get().then(value => {
      user = value; paint(); attachSync();
      if (params.get('login') === 'success') dialog.showModal();
    }).catch(() => {
      if (params.get('login') === 'success') {
        message.textContent = 'Η συνεδρία σύνδεσης δεν επιβεβαιώθηκε. Δοκίμασε ξανά τη σύνδεση Google.';
        dialog.showModal();
      }
    });
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
