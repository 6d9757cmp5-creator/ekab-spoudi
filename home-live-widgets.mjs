import { HERAKLION_DUTY_SOURCES, heraklionOnDuty } from './services/on-duty/heraklion.mjs';
import { weakestStudyArea } from './services/progress/study-pulse.mjs';

const athensDateTime = new Intl.DateTimeFormat('el-GR', {
  timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const formatTime = date => athensDateTime.format(date);

function renderPulse() {
  const card = document.querySelector('[data-study-pulse]');
  if (!card) return;
  const title = card.querySelector('[data-pulse-title]');
  const detail = card.querySelector('[data-pulse-detail]');
  const action = card.querySelector('[data-pulse-action]');
  const area = weakestStudyArea();
  if (!area) {
    title.textContent = 'Δεν έχει βρεθεί ακόμη αδύναμο σημείο';
    detail.textContent = 'Θα εμφανιστεί μετά από 3 αξιολογημένες απαντήσεις στην ίδια ενότητα.';
    action.hidden = true;
    return;
  }
  title.textContent = `Αδύναμο σημείο: ${area.label} · ${area.accuracy}%`;
  detail.textContent = `${area.correct} σωστές από ${area.attempts} απαντήσεις που έχουν καταγραφεί στην Πρόοδο.`;
  action.href = area.href;
  action.hidden = false;
}

function renderDuty() {
  const card = document.querySelector('[data-heraklion-duty]');
  if (!card) return;
  const hospital = card.querySelector('[data-duty-name]');
  const windowLabel = card.querySelector('[data-duty-window]');
  const phone = card.querySelector('[data-duty-phone]');
  const status = card.querySelector('[data-duty-status]');
  const duty = heraklionOnDuty(new Date());
  if (!duty) {
    hospital.textContent = 'Δεν υπάρχει επιβεβαιωμένο πρόγραμμα για αυτή την ημερομηνία.';
    windowLabel.textContent = 'Το δημοσιευμένο πρόγραμμα έχει λήξει ή δεν καλύπτει τη σημερινή ημερομηνία.';
    status.textContent = 'Έλεγξε την επίσημη πηγή πριν από τη διακομιδή.';
    phone.hidden = true;
  } else {
    hospital.textContent = duty.name;
    windowLabel.textContent = `Γενική εφημερία: ${duty.shiftLabel}`;
    phone.href = `tel:${duty.phone}`;
    phone.textContent = `Κλήση ${duty.displayPhone}`;
    phone.hidden = false;
    status.textContent = `Ενημέρωση ${formatTime(new Date())} · ώρα Ελλάδας`;
  }
  const source = card.querySelector('[data-duty-roster]');
  if (source) source.href = HERAKLION_DUTY_SOURCES.roster;
  const live = card.querySelector('[data-duty-live]');
  if (live) live.href = HERAKLION_DUTY_SOURCES.live;
}

function initLocation() {
  const card = document.querySelector('[data-ekab-location]');
  if (!card) return;
  const startButton = card.querySelector('[data-location-start]');
  const stopButton = card.querySelector('[data-location-stop]');
  const copyButton = card.querySelector('[data-location-copy]');
  const shareButton = card.querySelector('[data-location-share]');
  const coords = card.querySelector('[data-location-coordinates]');
  const status = card.querySelector('[data-location-status]');
  const mapLink = card.querySelector('[data-location-map]');
  let watchId = null, latest = null;

  const setStatus = value => { status.textContent = value; };
  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    startButton.hidden = false;
    stopButton.hidden = true;
  }
  function payload() {
    if (!latest) return '';
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy } = latest.coords;
    const rows = [`Συντεταγμένες: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, `Ακρίβεια GPS: περίπου ±${Math.round(accuracy)} μ.`];
    if (Number.isFinite(altitude)) rows.push(`Υψόμετρο WGS84: ${Math.round(altitude)} μ.${Number.isFinite(altitudeAccuracy) ? ` (±${Math.round(altitudeAccuracy)} μ.)` : ''}`);
    rows.push(`Χάρτης: https://maps.google.com/?q=${latitude},${longitude}`);
    return rows.join('\n');
  }
  function receive(position) {
    latest = position;
    const { latitude, longitude, accuracy, altitude } = position.coords;
    coords.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)} · ακρίβεια ±${Math.round(accuracy)} μέτρα` +
      (Number.isFinite(altitude) ? ` · υψόμετρο ${Math.round(altitude)} μέτρα (WGS84)` : ' · υψόμετρο μη διαθέσιμο');
    mapLink.href = `https://maps.google.com/?q=${latitude},${longitude}`;
    mapLink.hidden = false;
    copyButton.hidden = false;
    shareButton.hidden = false;
    setStatus(`Τελευταίο στίγμα ${formatTime(new Date(position.timestamp))}. Αποθηκεύεται μόνο προσωρινά σε αυτή τη σελίδα.`);
  }
  function error(reason) {
    if (reason.code === 1) {
      stop();
      setStatus('Δεν δόθηκε άδεια τοποθεσίας. Επίτρεψέ την από τις ρυθμίσεις του browser.');
    } else if (reason.code === 2) {
      setStatus('Δεν βρέθηκε ακόμη στίγμα. Η αναζήτηση συνεχίζεται· δοκίμασε σε ανοιχτό χώρο.');
    } else if (reason.code === 3) {
      setStatus('Η λήψη καθυστερεί. Συνεχίζω να αναζητώ στίγμα· άφησε τη σελίδα ανοιχτή.');
    } else {
      stop();
      setStatus('Ο εντοπισμός διακόπηκε. Πάτησε ξανά για νέα προσπάθεια.');
    }
  }
  startButton.addEventListener('click', () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus('Ο browser δεν υποστηρίζει ασφαλή εντοπισμό σε αυτή τη σύνδεση.');
      return;
    }
    if (watchId !== null) return;
    latest = null;
    coords.textContent = 'Αναμονή για νέο στίγμα…';
    copyButton.hidden = true;
    shareButton.hidden = true;
    mapLink.hidden = true;
    startButton.hidden = true;
    stopButton.hidden = false;
    setStatus('Αναμονή άδειας και σήματος GPS…');
    try {
      watchId = navigator.geolocation.watchPosition(receive, error, {
        enableHighAccuracy: true, maximumAge: 0, timeout: 60_000
      });
    } catch {
      stop();
      setStatus('Δεν ήταν δυνατή η εκκίνηση GPS. Έλεγξε την άδεια τοποθεσίας του browser.');
    }
  });
  stopButton.addEventListener('click', () => { stop(); setStatus('Ο ζωντανός εντοπισμός σταμάτησε.'); });
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(payload());
      setStatus('Οι συντεταγμένες αντιγράφηκαν. Δεν στάλθηκαν.');
    } catch {
      setStatus('Η αντιγραφή δεν υποστηρίζεται από τον browser. Άνοιξε τον χάρτη ή χρησιμοποίησε Κοινή χρήση.');
    }
  });
  shareButton.addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Συντεταγμένες ΕΚΑΒ', text: payload() }); }
      catch (reason) { if (reason?.name !== 'AbortError') setStatus('Η κοινή χρήση δεν ολοκληρώθηκε.'); }
    } else {
      try {
        await navigator.clipboard.writeText(payload());
        setStatus('Δεν υπάρχει κοινή χρήση σε αυτή τη συσκευή· οι συντεταγμένες αντιγράφηκαν.');
      } catch { setStatus('Η κοινή χρήση δεν υποστηρίζεται από αυτή τη συσκευή.'); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && watchId !== null) {
      stop();
      setStatus('Ο εντοπισμός σταμάτησε όταν έκρυψες τη σελίδα.');
    }
  });
  window.addEventListener('pagehide', stop, { once: true });
}

renderDuty();
renderPulse();
initLocation();
window.addEventListener('storage', () => { renderPulse(); renderDuty(); });
window.addEventListener('focus', () => { renderPulse(); renderDuty(); });
window.addEventListener('pageshow', () => { renderPulse(); renderDuty(); });
window.addEventListener('ekab:progress-changed', renderPulse);
window.addEventListener('ekab:activity-updated', renderPulse);
window.addEventListener('ekab:cloud-applied', renderPulse);
window.setInterval(renderDuty, 60_000);

