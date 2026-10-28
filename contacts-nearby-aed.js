/* Optional OpenStreetMap nearby AED discovery. The authoritative map remains apinidotes.crete.gov.gr. */
(() => {
  'use strict';
  const button = document.getElementById('aedFindNearby');
  const status = document.getElementById('aedNearbyStatus');
  const mapNode = document.getElementById('aedNearbyMap');
  const results = document.getElementById('aedNearbyResults');
  const counter = document.getElementById('aedNearbyCount');
  if (!button || !status || !mapNode || !results || !counter) return;

  const kmBetween = (a, b, c, d) => {
    const rad = Math.PI / 180, deltaLat = (c - a) * rad, deltaLon = (d - b) * rad;
    const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(deltaLon / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const withinCrete = (lat, lon) => lat >= 34.65 && lat <= 36.05 && lon >= 23.1 && lon <= 26.7;
  let map, markers, userMarker, lastCoords;
  const update = (value, danger = false) => {
    status.textContent = value;
    status.dataset.error = String(danger);
  };
  const mapReady = () => {
    if (!window.L) {
      update('Ο χάρτης OpenStreetMap δεν φορτώθηκε. Χρησιμοποίησε τον επίσημο χάρτη πιο πάνω.', true);
      return false;
    }
    if (!map) {
      map = L.map(mapNode, { zoomControl: true, scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      markers = L.layerGroup().addTo(map);
    }
    mapNode.hidden = false;
    return true;
  };
  const render = (lat, lon, aeds) => {
    if (!mapReady()) return;
    map.setView([lat, lon], 15);
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([lat, lon], {
      radius: 10, color: '#ffffff', weight: 3, fillColor: '#167bc4', fillOpacity: 1
    }).bindPopup('Η θέση σου (κατά προσέγγιση)').addTo(map);
    markers.clearLayers();
    results.replaceChildren();
    counter.textContent = aeds.length + ' πιθανές καταχωρίσεις σε ακτίνα 5 χλμ. (OpenStreetMap)';
    for (const aed of aeds.slice(0, 100)) {
      const dot = L.circleMarker([aed.lat, aed.lon], {
        radius: 8, color: '#ffffff', weight: 2, fillColor: '#d52e4a', fillOpacity: 1
      }).addTo(markers);
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = aed.name;
      const desc = document.createElement('p');
      desc.textContent = aed.distance.toFixed(2).replace('.', ',') + ' χλμ. σε ευθεία γραμμή · Μη επαληθευμένη διαθεσιμότητα';
      const directions = document.createElement('a');
      directions.textContent = 'Οδηγίες διαδρομής ↗';
      directions.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(aed.lat + ',' + aed.lon);
      directions.target = '_blank';
      directions.rel = 'noopener noreferrer';
      popup.append(title, desc, directions);
      dot.bindPopup(popup);
    }
    for (const aed of aeds.slice(0, 10)) {
      const item = document.createElement('li'), strong = document.createElement('strong');
      strong.textContent = aed.name;
      const detail = document.createElement('span');
      detail.textContent = ' · ' + aed.distance.toFixed(2).replace('.', ',') + ' χλμ. ευθεία';
      const link = document.createElement('a');
      link.textContent = 'Διαδρομή ↗';
      link.href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(aed.lat + ',' + aed.lon);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(strong, detail, document.createTextNode(' '), link);
      results.appendChild(item);
    }
    if (!aeds.length) update('Δεν εντοπίστηκαν καταχωρίσεις OpenStreetMap εντός 5 χλμ. Αυτό ΔΕΝ σημαίνει ότι δεν υπάρχουν επίσημοι ΑΕΑ. Έλεγξε τον χάρτη της Περιφέρειας Κρήτης.');
    else update('Εντοπίστηκε η θέση σου. Κόκκινα σημεία: πιθανές καταχωρίσεις OpenStreetMap, όχι ο επίσημος κατάλογος του Προγράμματος ΖΩΗ.');
    requestAnimationFrame(() => map.invalidateSize());
  };

  const findNearby = () => {
    if (!navigator.geolocation) { update('Αυτή η συσκευή δεν προσφέρει εντοπισμό τοποθεσίας. Άνοιξε τον επίσημο χάρτη.', true); return; }
    button.disabled = true;
    update('Εντοπισμός τοποθεσίας…');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      lastCoords = { lat, lon };
      if (!withinCrete(lat, lon)) {
        update('Η θέση φαίνεται εκτός Κρήτης. Για επίσημους απινιδωτές χρησιμοποίησε τον σύνδεσμο της Περιφέρειας.', true);
        button.disabled = false;
        return;
      }
      if (mapReady()) {
        map.setView([lat, lon], 15);
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([lat, lon], {
          radius: 10, color: '#ffffff', weight: 3, fillColor: '#167bc4', fillOpacity: 1
        }).addTo(map);
        requestAnimationFrame(() => map.invalidateSize());
      }
      update('Η θέση σου βρέθηκε. Αναζήτηση σε ανοιχτές, μη επαληθευμένες καταχωρίσεις…');
      try {
        const query = '[out:json][timeout:20];(node["emergency"="defibrillator"](around:5000,' + lat + ',' + lon +
          ');way["emergency"="defibrillator"](around:5000,' + lat + ',' + lon +
          ');relation["emergency"="defibrillator"](around:5000,' + lat + ',' + lon + '););out center;';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        let response;
        try {
          response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: new URLSearchParams({ data: query }),
            signal: controller.signal,
            cache: 'no-store'
          });
        } finally { clearTimeout(timeout); }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const unique = new Map();
        for (const element of Array.isArray(data.elements) ? data.elements : []) {
          const y = Number(element.lat ?? element.center?.lat);
          const x = Number(element.lon ?? element.center?.lon);
          if (!Number.isFinite(y) || !Number.isFinite(x) || !withinCrete(y, x)) continue;
          const distance = kmBetween(lat, lon, y, x);
          if (distance > 5) continue;
          const key = y.toFixed(5) + ',' + x.toFixed(5);
          if (unique.has(key)) continue;
          const name = (typeof element.tags?.name === 'string' && element.tags.name.trim()) ||
            (typeof element.tags?.['addr:street'] === 'string' && element.tags['addr:street'].trim()) ||
            'Απινιδωτής (καταχώριση OpenStreetMap)';
          unique.set(key, { lat: y, lon: x, distance, name: name.slice(0, 120) });
        }
        render(lat, lon, [...unique.values()].sort((a, b) => a.distance - b.distance));
      } catch (_error) {
        if (mapReady()) map.setView([lat, lon], 15);
        results.replaceChildren();
        counter.textContent = '';
        update('Η θέση σου εντοπίστηκε, αλλά δεν ήταν δυνατή η ανάκτηση μη επίσημων σημείων. Χρησιμοποίησε τον χάρτη της Περιφέρειας Κρήτης.', true);
      } finally { button.disabled = false; }
    }, () => {
      button.disabled = false;
      update('Δεν δόθηκε άδεια τοποθεσίας ή ο εντοπισμός απέτυχε. Μπορείς πάντα να χρησιμοποιήσεις τον επίσημο χάρτη.', true);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 });
  };
  button.addEventListener('click', findNearby);
  if (navigator.permissions?.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(permission => {
      if (permission.state === 'granted') findNearby();
    }).catch(() => {});
  }
})();