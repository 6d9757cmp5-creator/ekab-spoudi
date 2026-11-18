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

let locationCard = null, watchId = null, latest = null;

function stopLocation(message) {
  if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  if (locationCard) {
    locationCard.querySelector('[data-location-start]').hidden = false;
    locationCard.querySelector('[data-location-stop]').hidden = true;
    if (message) locationCard.querySelector('[data-location-status]').textContent = message;
  }
}

function initLocation() {
  const card = document.querySelector('[data-ekab-location]');
  if (!card) {
    if (locationCard) stopLocation();
    locationCard = null;
    latest = null;
    return;
  }
  if (card === locationCard) return;
  if (locationCard) stopLocation();

  locationCard = card;
  const startButton = card.querySelector('[data-location-start]');
  const stopButton = card.querySelector('[data-location-stop]');
  const copyButton = card.querySelector('[data-location-copy]');
  const shareButton = card.querySelector('[data-location-share]');
  const coords = card.querySelector('[data-location-coordinates]');
  const status = card.querySelector('[data-location-status]');
  const mapLink = card.querySelector('[data-location-map]');

  function payload() {
    if (!latest) return '';
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy } = latest.coords;
    const rows = [`Συντεταγμένες: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, `Ακρίβεια GPS: περίπου ±${Math.round(accuracy)} μ.`];
    if (Number.isFinite(altitude)) rows.push(`Υψόμετρο WGS84: ${Math.round(altitude)} μ.${Number.isFinite(altitudeAccuracy) ? ` (±${Math.round(altitudeAccuracy)} μ.)` : ''}`);
    rows.push(`Χάρτης: https://maps.google.com/?q=${latitude},${longitude}`);
    return rows.join('\\n');
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
    status.textContent = `Τελευταίο στίγμα ${formatTime(new Date(position.timestamp))}. Παραμένει προσωρινά σε αυτή τη σελίδα.`;
  }

  function error(reason) {
    if (reason.code === 1) {
      stopLocation('Η άδεια τοποθεσίας απορρίφθηκε. Επίτρεψε την Τοποθεσία για αυτόν τον ιστότοπο στις ρυθμίσεις του browser και πάτησε ξανά.');
    } else if (reason.code === 2) {
      status.textContent = 'Η συσκευή δεν έδωσε στίγμα. Έλεγξε ότι είναι ενεργή η Τοποθεσία και η ακριβής θέση στις ρυθμίσεις κινητού.';
    } else if (reason.code === 3) {
      status.textContent = 'Αργεί το στίγμα. Συνεχίζω την αναζήτηση· κράτησε ανοιχτή τη σελίδα και ενεργό το GPS.';
    } else {
      stopLocation('Η λήψη GPS διακόπηκε. Έλεγξε την άδεια browser και δοκίμασε ξανά.');
    }
  }

  startButton.addEventListener('click', () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      status.textContent = 'Ο browser δεν υποστηρίζει ασφαλή εντοπισμό. Άνοιξε τη σελίδα μέσω HTTPS.';
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
    status.textContent = 'Ζητώ άδεια τοποθεσίας από τον browser και στίγμα GPS…';
    try {
      watchId = navigator.geolocation.watchPosition(receive, error, {
        enableHighAccuracy: true, maximumAge: 0, timeout: 60_000
      });
    } catch {
      stopLocation('Δεν ξεκίνησε η λήψη GPS. Έλεγξε την άδεια τοποθεσίας του browser και δοκίμασε ξανά.');
    }
  });

  stopButton.addEventListener('click', () => stopLocation('Ο ζωντανός εντοπισμός σταμάτησε.'));
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(payload());
      status.textContent = 'Οι συντεταγμένες αντιγράφηκαν. Δεν στάλθηκαν.';
    } catch {
      status.textContent = 'Η αντιγραφή δεν υποστηρίζεται από τον browser. Άνοιξε τον χάρτη ή χρησιμοποίησε Κοινή χρήση.';
    }
  });
  shareButton.addEventListener('click', async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Συντεταγμένες ΕΚΑΒ', text: payload() }); }
      catch (reason) { if (reason?.name !== 'AbortError') status.textContent = 'Η κοινή χρήση δεν ολοκληρώθηκε.'; }
    } else {
      try {
        await navigator.clipboard.writeText(payload());
        status.textContent = 'Δεν υπάρχει κοινή χρήση σε αυτή τη συσκευή· οι συντεταγμένες αντιγράφηκαν.';
      } catch { status.textContent = 'Η κοινή χρήση δεν υποστηρίζεται από αυτή τη συσκευή.'; }
    }
  });
}

function handleLocationVisibility() {
  if (!locationCard) return;
  if (document.hidden && watchId !== null) {
    stopLocation('Ο εντοπισμός σταμάτησε όταν έκρυψες τη σελίδα. Πάτησε ξανά για νέο στίγμα.');
  }
}

window.addEventListener('ekab:home-ready', initLocation);
window.addEventListener('pageshow', initLocation);
window.addEventListener('pagehide', () => stopLocation(), { once: false });
document.addEventListener('visibilitychange', handleLocationVisibility);

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

