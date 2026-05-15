// ─── Address Search & Map Picker ───
// Nominatim geocoding bilan manzil qidiruv va xaritada tanlash

class AddressSearchPicker {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.apiBase = options.apiBase || 'https://gilam-api.ecos.uz/api';
    this.token = options.token || '';
    this.onConfirm = options.onConfirm || (() => {});
    this.debounceTimer = null;
    this.selectedResult = null;
    this.marker = null;
    this.confirmed = false;

    this.data = {
      address_text: '',
      formatted_address: '',
      latitude: null,
      longitude: null,
      place_id: '',
      confirmed_by_operator: false,
    };

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div style="font-family:system-ui;position:relative;">
        <div style="position:relative;margin-bottom:8px;">
          <input id="addr-input" type="text" placeholder="Manzilni kiriting..."
            style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;font-weight:600;transition:border 0.2s;"
            onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e2e8f0'" />
          <div id="addr-results" style="position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e2e8f0;border-radius:12px;max-height:240px;overflow-y:auto;z-index:1000;display:none;box-shadow:0 8px 32px rgba(0,0,0,0.1);margin-top:4px;"></div>
        </div>
        <div id="addr-map" style="width:100%;height:300px;border-radius:12px;border:2px solid #e2e8f0;overflow:hidden;"></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <div id="addr-coords" style="flex:1;padding:8px 12px;background:#f8fafc;border-radius:10px;font-size:11px;color:#64748b;font-weight:600;"></div>
          <button id="addr-confirm" style="padding:8px 20px;background:#10b981;color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;opacity:0.5;" disabled>
            ✅ Manzilni Tasdiqlash
          </button>
        </div>
        <div id="addr-status" style="margin-top:6px;font-size:11px;font-weight:600;color:#94a3b8;"></div>
      </div>
    `;

    this.input = this.container.querySelector('#addr-input');
    this.resultsDiv = this.container.querySelector('#addr-results');
    this.coordsDiv = this.container.querySelector('#addr-coords');
    this.confirmBtn = this.container.querySelector('#addr-confirm');
    this.statusDiv = this.container.querySelector('#addr-status');

    // Map
    this.map = L.map(this.container.querySelector('#addr-map')).setView([41.2995, 69.2401], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
    }).addTo(this.map);

    // Map click — marker qo'yish
    this.map.on('click', (e) => {
      this.setMarker(e.latlng.lat, e.latlng.lng);
      this.data.latitude = e.latlng.lat;
      this.data.longitude = e.latlng.lng;
      this.data.formatted_address = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
      this.updateCoords();
      this.enableConfirm();
    });

    // Input debounce search
    this.input.addEventListener('input', () => {
      this.data.address_text = this.input.value;
      this.confirmed = false;
      clearTimeout(this.debounceTimer);
      if (this.input.value.length < 3) {
        this.resultsDiv.style.display = 'none';
        return;
      }
      this.debounceTimer = setTimeout(() => this.search(this.input.value), 400);
    });

    // Confirm button
    this.confirmBtn.addEventListener('click', () => {
      if (!this.data.latitude) return;
      this.data.address_text = this.input.value;
      this.data.confirmed_by_operator = true;
      this.confirmed = true;
      this.statusDiv.innerHTML = '✅ Manzil tasdiqlandi';
      this.statusDiv.style.color = '#10b981';
      this.onConfirm(this.data);
    });
  }

  async search(query) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=uz&limit=8&accept-language=uz,ru`
      );
      const results = await res.json();
      this.showResults(results);
    } catch (e) {
      console.error('Search error:', e);
    }
  }

  showResults(results) {
    if (!results.length) {
      this.resultsDiv.style.display = 'none';
      return;
    }

    this.resultsDiv.innerHTML = results.map((r, i) => `
      <div data-idx="${i}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background 0.15s;"
        onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'">
        <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0;">${r.display_name.split(',')[0]}</p>
        <p style="font-size:11px;color:#94a3b8;margin:2px 0 0;">${r.display_name}</p>
      </div>
    `).join('');

    this.resultsDiv.style.display = 'block';

    // Click handler
    this.resultsDiv.querySelectorAll('[data-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        const r = results[idx];
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);

        this.setMarker(lat, lng);
        this.map.flyTo([lat, lng], 16, { animate: true, duration: 1 });

        this.data.latitude = lat;
        this.data.longitude = lng;
        this.data.formatted_address = r.display_name;
        this.data.place_id = r.place_id || '';

        // MUHIM: input matnini AVTOMATIK O'ZGARTIRMAYMIZ!
        this.updateCoords();
        this.enableConfirm();
        this.resultsDiv.style.display = 'none';
      });
    });
  }

  setMarker(lat, lng) {
    if (this.marker) this.map.removeLayer(this.marker);
    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

    // Drag end — koordinatlarni yangilash
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.data.latitude = pos.lat;
      this.data.longitude = pos.lng;
      this.updateCoords();
      this.enableConfirm();
    });
  }

  updateCoords() {
    if (this.data.latitude) {
      this.coordsDiv.innerHTML = `📍 ${this.data.latitude.toFixed(6)}, ${this.data.longitude.toFixed(6)}`;
    }
  }

  enableConfirm() {
    this.confirmBtn.disabled = false;
    this.confirmBtn.style.opacity = '1';
    this.statusDiv.innerHTML = '⚠️ Manzilni tasdiqlang';
    this.statusDiv.style.color = '#f59e0b';
    this.confirmed = false;
  }

  setAddress(data) {
    if (data.address_text) this.input.value = data.address_text;
    if (data.latitude && data.longitude) {
      this.setMarker(data.latitude, data.longitude);
      this.map.flyTo([data.latitude, data.longitude], 16);
      this.data = { ...this.data, ...data };
      this.updateCoords();
    }
  }

  getData() {
    return this.data;
  }
}

// Export for Electron
if (typeof module !== 'undefined') {
  module.exports = { AddressSearchPicker };
}
