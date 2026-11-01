/* Official Crete AED positions from Πρόγραμμα ΖΩΗ, not OpenStreetMap AED data. */
(() => {
  'use strict';
  const API = 'https://apinidotes-api.crete.gov.gr/apinidotesApi/api/Defibrillators';
  const button = document.getElementById('aedFindNearby');
  const status = document.getElementById('aedNearbyStatus');
  const mapElement = document.getElementById('aedNearbyMap');
  const radiusSelect = document.getElementById('aedSearchRadius');
  if (!button || !status || !mapElement) return;
  const CRETE = { lat: 35.2, lon: 24.9 };
  const RADIUS = () => Math.max(1, Math.min(50, Number(radiusSelect?.value) || 10));
  const inCrete = (lat, lon) => lat >= 34.65 && lat <= 36.05 && lon >= 23.1 && lon <= 26.7;
  const kilometers = (a, b, c, d) => {
    const radians = Math.PI / 180;
    const x = (c - a) * radians, y = (d - b) * radians;
    const h = Math.sin(x / 2) ** 2 +
      Math.cos(a * radians) * Math.cos(c * radians) * Math.sin(y / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const msg = (s, error = false) => { status.textContent = s; status.dataset.error = String(error); status.hidden = !s || (!error && s !== 'Εντοπισμός της θέσης σου…'); };
  let map, markerLayer, locationMarker, currentLocation, positions = [];
  let loaded = false, loading = false;

  const labelFor = item => {
    for (const raw of [item.position, item.address]) {
      if (typeof raw === 'string' && raw.trim()) return raw.trim().slice(0, 160);
    }
    return 'Σημείο απινιδωτή';
  };
  const availabilityText = item => {
    if (item.twentyFourSeven === true) return '24ωρη πρόσβαση σύμφωνα με την καταχώριση';
    const hours = Array.isArray(item.workingHours) ? item.workingHours : [];
    const text = hours.filter(x => x && typeof x.day === 'string' &&
      typeof x.startHour === 'string' && typeof x.endHour === 'string')
      .slice(0, 7).map(x => x.day.slice(0, 24) + ' ' +
        x.startHour.slice(0, 5) + '–' + x.endHour.slice(0, 5)).join(' · ');
    return text || 'Δεν έχει καταχωριστεί συγκεκριμένο ωράριο πρόσβασης';
  };
  const directionsURL = (lat, lon) =>
    'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(lat + ',' + lon);

  const initMap = () => {
    if (!window.L) {
      msg('Δεν φορτώθηκε το υπόβαθρο χάρτη. Χρησιμοποίησε τον επίσημο σύνδεσμο παραπάνω.', true);
      return false;
    }
    if (!map) {
      mapElement.hidden = false;
      map = L.map(mapElement, { scrollWheelZoom: false, zoomControl: true })
        .setView([CRETE.lat, CRETE.lon], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors · Θέσεις ΑΕΑ: Περιφέρεια Κρήτης'
      }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
    }
    return true;
  };
  function addMarker(item) {
    const dot = L.circleMarker([item.lat, item.lon], {
      radius: 7, color: '#fff', weight: 2, fillColor: '#20824e', fillOpacity: 1
    }).addTo(markerLayer);
    const wrapper = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.label;
    const address = document.createElement('p');
    address.textContent = item.address || 'Δεν υπάρχει λεπτομερής διεύθυνση';
    const hours = document.createElement('p');
    hours.textContent = item.hours;
    const link = document.createElement('a');
    link.textContent = 'Οδηγίες διαδρομής ↗';
    link.href = directionsURL(item.lat, item.lon);
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    wrapper.append(title, address, hours, link);
    dot.bindPopup(wrapper);
    return dot;
  }
  const render = () => {
    if (!initMap()) return;
    markerLayer.clearLayers();
    if (locationMarker) { map.removeLayer(locationMarker); locationMarker = null; }
    const nearby = currentLocation ? positions.map(item => ({
      ...item, distance: kilometers(currentLocation.lat, currentLocation.lon, item.lat, item.lon)
    })).sort((a, b) => a.distance - b.distance) : [];
    const radius = RADIUS();
    const chosen = currentLocation
      ? nearby.filter(item => item.distance <= radius)
      : positions;
    for (const item of chosen) addMarker(item);
    if (currentLocation) {
      const { lat, lon } = currentLocation;
      locationMarker = L.circleMarker([lat, lon], {
        radius: 10, color: '#fff', weight: 3, fillColor: '#147cc6', fillOpacity: 1
      }).bindPopup('Η θέση σου (κατά προσέγγιση)').addTo(map);
      map.setView([lat, lon], 14);
      msg(chosen.length ? '' : 'Δεν βρέθηκε διαθέσιμος απινιδωτής στην επιλεγμένη ακτίνα. Επίλεξε μεγαλύτερη.', chosen.length === 0);
    } else {
      map.setView([CRETE.lat, CRETE.lon], 9);
      msg('');
    }
    requestAnimationFrame(() => map.invalidateSize());
  };

  const loadPositions = async () => {
    if (loading) return;
    loading = true;
    msg('Ανάκτηση επίσημων σημείων από το Πρόγραμμα ΖΩΗ…');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 18000);
    try {
      const response = await fetch(API, {
        method: 'GET', mode: 'cors', credentials: 'omit',
        cache: 'no-store', referrerPolicy: 'no-referrer',
        signal: abort.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error('Invalid official AED list');
      const unique = new Map();
      for (const item of rows) {
        if (!item || item.availability !== true || item.public !== true) continue;
        // The provider sets functional=false even for records that it marks as
        // available. Match its own public list rather than misreading this field.
        const lat = Number(String(item.latitude ?? '').trim());
        const lon = Number(String(item.longtitude ?? '').trim());
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inCrete(lat, lon)) continue;
        const id = String(item.defibrillatorsId ?? lat + ',' + lon);
        if (unique.has(id)) continue;
        unique.set(id, {
          lat, lon, label: labelFor(item),
          address: typeof item.address === 'string' ? item.address.trim().slice(0, 220) : '',
          hours: availabilityText(item)
        });
      }
      positions = [...unique.values()];
      loaded = true;
      render();
    } catch (_e) {
      loaded = false;
      msg('Αδυναμία σύνδεσης με την επίσημη βάση απινιδωτών. Άνοιξε τον χάρτη της Περιφέρειας Κρήτης.', true);
    } finally {
      clearTimeout(timer);
      loading = false;
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      msg('Η συσκευή δεν υποστηρίζει γεωεντοπισμό. Άνοιξε τον επίσημο χάρτη.', true);
      return;
    }
    button.disabled = true;
    msg('Εντοπισμός της θέσης σου…');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      button.disabled = false;
      const lat = coords.latitude, lon = coords.longitude;
      if (!inCrete(lat, lon)) {
        msg('Η θέση σου φαίνεται εκτός Κρήτης. Εμφανίζονται μόνο τα επίσημα σημεία της Κρήτης.', true);
        return;
      }
      currentLocation = { lat, lon };
      if (loaded) render();
      else if (!loading) loadPositions();
    }, () => {
      button.disabled = false;
      msg('Δεν δόθηκε άδεια τοποθεσίας ή ο εντοπισμός απέτυχε. Ο χάρτης παραμένει διαθέσιμος χωρίς GPS.', true);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 });
  };
  button.addEventListener('click', locate);
  radiusSelect?.addEventListener('change', () => { if (loaded) render(); });
  // Only auto-locate with a previously GRANTED permission; never prompt silently.
  if (navigator.permissions?.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(permission => {
      if (permission.state === 'granted') locate();
    }).catch(() => {});
  }
  loadPositions();
})();