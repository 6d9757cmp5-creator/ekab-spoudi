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
      <p class="small muted">Πρόοδος ΕΟΠΠΕΠ/ΣΑΕΚ/σεμιναρίων, σημειώσεις, PDF και ρυθμίσεις. Ιδιωτικά στον λογαριασμό σου. Δωρεάν όριο: 50 MB ανά PDF.</p>
      <button class="btn compact ghost" data-sync-recover type="button">Ανάκτηση τοπικού αντιγράφου</button>
    </section>
    <details class="fold storage-panel"><summary>Αποθήκευση, αντίγραφα &amp; ενημερώσεις <span class="storage-summary-note">Στη συσκευή σου</span></summary><div class="body">
<p class="sync-summary" data-sync-summary role="status" aria-live="polite">Τα τοπικά αντίγραφα είναι διαθέσιμα χωρίς σύνδεση Google.</p><div class="storage-intro"><p>Η πρόοδός σου αποθηκεύεται αυτόματα σε αυτή τη συσκευή.</p><p class="save-state" data-save-status role="status" aria-live="polite">Έλεγχος αποθήκευσης…</p></div>
<div class="backup-grid">
<section class="backup-card"><h3>Κράτησε ένα αντίγραφο</h3><p>Κατέβασε την πρόοδο ΕΟΠΠΕΠ και ΣΑΕΚ για να τη μεταφέρεις ή να την επαναφέρεις.</p><button class="btn compact" data-export-all type="button">Λήψη αντιγράφου προόδου</button><p class="small muted backup-hint">Τα προσωπικά PDF εξάγονται ξεχωριστά από τη βιβλιοθήκη «Τα PDF μου».</p></section>
<section class="backup-card"><h3>Επαναφορά από αντίγραφο</h3><p>Επίλεξε το αρχείο JSON που είχες εξαγάγει. Θα ζητηθεί επιβεβαίωση πριν αντικατασταθεί η πρόοδος.</p><div class="file-select"><input id="importEverything" data-restore-all type="file" accept=".json,application/json" aria-label="Επιλογή αντιγράφου προόδου JSON"><label class="btn compact secondary" for="importEverything">Επιλογή αρχείου JSON</label><span data-file-label>Δεν έχει επιλεγεί αρχείο</span></div></section>
</div>
<div class="app-version-row"><div><strong>Έκδοση <span id="currentAppVersion">v27.1.73</span></strong><p id="updateCheckStatus" role="status" aria-live="polite">Έλεγχος διαθέσιμης έκδοσης…</p></div><button class="btn compact secondary" id="checkAppUpdates" type="button">Έλεγχος ενημέρωσης</button></div>
<details class="storage-advanced"><summary>Προχωρημένες επιλογές</summary><div class="advanced-content"><h3>Παλαιό αντίγραφο ΕΟΠΠΕΠ</h3><p class="small muted">Μόνο για παλαιότερα αρχεία προόδου v15–v19.</p><div class="file-select"><input id="restore" type="file" accept=".json,application/json" aria-label="Επιλογή παλαιού αντιγράφου ΕΟΠΠΕΠ"><label class="btn compact secondary" for="restore">Επιλογή παλαιού JSON</label><span data-file-label>Δεν έχει επιλεγεί αρχείο</span></div><p class="small muted" id="restoreNotice" role="status" aria-live="polite"></p><div class="reset-progress"><h3>Επαναφορά προόδου ανά ενότητα</h3><p>Διάλεξε τι θέλεις να μηδενίσεις. Τα προσωπικά PDF, ο λογαριασμός και οι ρυθμίσεις σύνδεσης δεν διαγράφονται.</p>
<div class="actions"><button class="btn compact danger-button" data-reset-scope="eoppep" type="button">Μηδενισμός ΕΟΠΠΕΠ</button><button class="btn compact danger-button" data-reset-scope="saek" type="button">Μηδενισμός ΣΑΕΚ</button><button class="btn compact danger-button" data-reset-scope="seminar:bls" type="button">Μηδενισμός BLS/AED</button><button class="btn compact danger-button" data-reset-scope="seminar:pbls" type="button">Μηδενισμός PBLS</button><button class="btn compact danger-button" data-reset-scope="seminar:ils" type="button">Μηδενισμός ILS</button><button class="btn compact danger-button" data-reset-scope="seminar:phtls" type="button">Μηδενισμός PHTLS</button><button class="btn compact danger-button" data-reset-scope="seminar:als" type="button">Μηδενισμός ALS</button></div><p class="small muted" data-reset-notice role="status" aria-live="polite"></p></div></div></details>
</div></details>
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
      const { initCloudSync }=await import('./cloud-sync.js?app=27.1.105');
      syncManager=await initCloudSync({user,status:panel.querySelector('[data-cloud-status]'),enableButton:panel.querySelector('[data-sync-enable]'),nowButton:panel.querySelector('[data-sync-now]'),pauseButton:panel.querySelector('[data-sync-pause]'),recoverButton:panel.querySelector('[data-sync-recover]')});
    }catch { panel.querySelector('[data-cloud-status]').textContent='Ο συγχρονισμός δεν είναι διαθέσιμος. Η τοπική αποθήκευση συνεχίζεται.'; }
  }
  function paint() {
    trigger.textContent = 'Λογαριασμός';
    login.hidden = Boolean(user);
    login.disabled = !cloudFeatures.googleLogin;
    logout.hidden = !user;
    message.textContent = user
      ? 'Έχεις συνδεθεί ως ' + (user.name || user.email || 'χρήστης') + '.'
      : cloudFeatures.googleLogin
        ? 'Συνδέσου με τον λογαριασμό σου Google.'
        : 'Η σύνδεση Google είναι σε προετοιμασία. Μπορείς να συνεχίσεις κανονικά τη μελέτη σου χωρίς λογαριασμό.';
  }
  trigger.addEventListener('click', () => {
    paint();
    const version=window.EkabUpdates?.version;
    if(version)dialog.querySelector('#currentAppVersion').textContent='v'+version;
    dialog.showModal();
    window.EkabProgress?.checkpoint().catch(()=>{});
    window.EkabUpdates?.check?.();
  });
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

  const legacyInput=dialog.querySelector('#restore');
  const resetLabels={eoppep:'ΕΟΠΠΕΠ',saek:'ΣΑΕΚ','seminar:bls':'BLS/AED','seminar:pbls':'PBLS','seminar:ils':'ILS','seminar:phtls':'PHTLS','seminar:als':'ALS'};
  function scopedKeys(scope){
    if(scope.startsWith('seminar:')){
      try{
        const saved=JSON.parse(localStorage.getItem('ekab.seminar-prep.local.v1')||'{}');
        return saved&&saved[scope.slice(8)]?[scope]:[];
      }catch{return []}
    }
    const result=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      const eoppep=k==='ekab-eoppep-official-v15';
      const saek=k.startsWith('ekab.saek.read.v1.')||k==='ekab.saek.exams.v1';
      if((scope==='eoppep'&&eoppep)||(scope==='saek'&&saek))result.push(k);
    }
    return result;
  }
  dialog.querySelectorAll('[data-reset-scope]').forEach(button=>button.addEventListener('click',async()=>{
    const scope=button.dataset.resetScope,label=resetLabels[scope];
    if(!label)return;
    const keys=scopedKeys(scope),notice=dialog.querySelector('[data-reset-notice]');
    if(!keys.length){notice.textContent='Δεν βρέθηκε αποθηκευμένη πρόοδος για '+label+'.';return}
    if(!confirm('1/2 — Να μηδενιστεί η πρόοδος '+label+'; Τα προσωπικά PDF διατηρούνται.'))return;
    if(!confirm('2/2 — ΟΡΙΣΤΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ: Θα διαγραφεί η αποθηκευμένη πρόοδος '+label+'. Έχεις κρατήσει αντίγραφο ασφαλείας;'))return;
    button.disabled=true;
    try{
      for(const key of keys){
        if(key.startsWith('seminar:')){
          const stored=JSON.parse(localStorage.getItem('ekab.seminar-prep.local.v1')||'{}');
          delete stored[key.slice(8)];
          localStorage.setItem('ekab.seminar-prep.local.v1',JSON.stringify(stored));
        }else localStorage.removeItem(key);
      }
      window.dispatchEvent(new Event('ekab:progress-changed'));
      await window.EkabProgress?.checkpoint?.();
      notice.textContent='Ο μηδενισμός ολοκληρώθηκε. Ενημέρωση σελίδας…';
      location.reload();
    }catch(error){notice.textContent='Ο μηδενισμός δεν ολοκληρώθηκε: '+error.message;button.disabled=false}
  }));
  legacyInput.addEventListener('change',async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    const notice=dialog.querySelector('#restoreNotice');
    try{
      if(file.size>2000000)throw Error('Το αρχείο είναι πολύ μεγάλο.');
      const data=JSON.parse(await file.text());
      const schemas=['ekab-official-progress-v15','ekab-official-progress-v16','ekab-official-progress-v17','ekab-official-progress-v18','ekab-official-progress-v19'];
      if(!schemas.includes(data.schema)||!data.progress||typeof data.progress!=='object'||Array.isArray(data.progress))
        throw Error('Δεν αναγνωρίστηκε αρχείο προόδου v15–v19.');
      const bankResponse=await fetch('official_questions.json');
      if(!bankResponse.ok)throw Error('Δεν φορτώθηκε η τράπεζα ΕΟΠΠΕΠ.');
      const ids=new Set((await bankResponse.json()).map(q=>q.id));
      const clean={};
      for(const [id,v] of Object.entries(data.progress)){
        if(!ids.has(id))continue;
        if(!v||!Number.isInteger(v.seen)||v.seen<0||!Number.isInteger(v.weak)||v.weak<0||
          !Number.isInteger(v.streak)||v.streak<0||typeof v.draft!=='string'||v.draft.length>25000)
          throw Error('Μη έγκυρα δεδομένα προόδου.');
        clean[id]={seen:v.seen,weak:v.weak,streak:v.streak,selfCorrect:Number(v.selfCorrect)||0,selfAttempts:Number(v.selfAttempts)||0,draft:v.draft};
      }
      if(!confirm('Να αντικατασταθεί η τωρινή πρόοδος ΕΟΠΠΕΠ με το παλιό αντίγραφο;'))return;
      localStorage.setItem('ekab-eoppep-official-v15',JSON.stringify(clean));
      await window.EkabProgress?.flush();
      location.reload();
    }catch(error){notice.textContent='Σφάλμα: '+error.message}
    finally{event.target.value=''}
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
