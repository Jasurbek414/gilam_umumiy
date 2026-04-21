/**
 * driver-map.js — Real-time haydovchilar xaritasi (OpenStreetMap)
 * Operator barcha kompaniya haydovchilarini real vaqtda xaritada ko'radi
 */

const DriverMap = {
  map: null,
  markers: {},
  refreshInterval: null,
  isInitialized: false,

  // Custom taxi icon
  taxiIcon: null,

  init() {
    if (this.isInitialized) return;
    
    // Observer: tab ochilganda xaritani ishga tushirish
    const tabBtn = document.querySelector('[data-tab="driver-map"]');
    if (tabBtn) {
      tabBtn.addEventListener('click', () => {
        setTimeout(() => this.initMap(), 200);
      });
    }

    // Refresh tugmasi
    document.getElementById('dmap-refresh')?.addEventListener('click', () => {
      this.loadDrivers();
      Utils.showToast('Xarita yangilandi', 'info');
    });

    this.isInitialized = true;
  },

  initMap() {
    if (this.map) {
      this.map.invalidateSize();
      this.loadDrivers();
      return;
    }

    const container = document.getElementById('driver-map-container');
    if (!container) return;

    // Create map — O'zbekiston markazi
    this.map = L.map('driver-map-container', {
      zoomControl: true,
      attributionControl: true,
    }).setView([41.0, 69.5], 7);

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    // Custom taxi icon
    this.taxiIcon = L.divIcon({
      className: 'dmap-taxi-icon',
      html: '<span class="material-icons-round" style="font-size:28px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.5);">local_taxi</span>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    this.loadDrivers();

    // Auto-refresh har 8 soniya
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.refreshInterval = setInterval(() => this.loadDrivers(), 8000);
  },

  async loadDrivers() {
    if (!window.Api || !window.Api.config.token) return;

    try {
      // Barcha userlarni olamiz
      const users = await window.Api.request('/users');
      const drivers = (Array.isArray(users) ? users : []).filter(u => u.role === 'DRIVER');

      const sidebar = document.getElementById('dmap-driver-list');
      const countEl = document.getElementById('dmap-driver-count');
      
      const onlineDrivers = drivers.filter(d => d.currentLocation);
      if (countEl) countEl.textContent = `${onlineDrivers.length} / ${drivers.length} faol`;

      // Sidebar va markerlarni yangilash
      if (sidebar) sidebar.innerHTML = '';

      drivers.forEach(driver => {
        const pos = this.parseLocation(driver.currentLocation);
        const hasGPS = pos !== null;
        const companyName = driver.company?.name || 'Noma\'lum kompaniya';

        // Sidebar card
        if (sidebar) {
          const card = document.createElement('div');
          card.className = 'dmap-driver-card';
          card.style.cssText = `
            padding: 10px 12px; margin-bottom: 6px; border-radius: 12px; cursor: pointer;
            background: var(--bg-card); border: 1px solid var(--border-light);
            transition: all 0.2s; display: flex; align-items: center; gap: 10px;
          `;
          card.onmouseenter = () => card.style.background = 'var(--bg-hover)';
          card.onmouseleave = () => card.style.background = 'var(--bg-card)';

          card.innerHTML = `
            <div style="width:36px;height:36px;border-radius:10px;background:${hasGPS ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-2)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span class="material-icons-round" style="font-size:18px;color:${hasGPS ? '#fff' : 'var(--text-muted)'};">local_taxi</span>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:12px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${driver.fullName || 'Nomsiz'}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:1px;">${companyName}</div>
              <div style="font-size:9px;margin-top:2px;font-weight:700;color:${hasGPS ? '#10b981' : 'var(--text-muted)'};">${hasGPS ? '● GPS FAOL' : '○ Aloqa yo\'q'}</div>
            </div>
          `;

          if (hasGPS) {
            card.onclick = () => {
              this.map.setView(pos, 16, { animate: true, duration: 0.8 });
              // Marker popup
              if (this.markers[driver.id]) {
                this.markers[driver.id].openPopup();
              }
            };
          }

          sidebar.appendChild(card);
        }

        // Map marker
        if (hasGPS && this.map) {
          if (this.markers[driver.id]) {
            this.markers[driver.id].setLatLng(pos);
          } else {
            const marker = L.marker(pos, { icon: this.taxiIcon }).addTo(this.map);
            marker.bindPopup(`
              <div style="font-family:sans-serif;min-width:160px;">
                <div style="font-weight:800;font-size:13px;margin-bottom:4px;">${driver.fullName}</div>
                <div style="font-size:11px;color:#666;">${companyName}</div>
                <div style="font-size:10px;color:#999;margin-top:4px;">${driver.phone || ''}</div>
              </div>
            `);
            this.markers[driver.id] = marker;
          }
        } else if (!hasGPS && this.markers[driver.id]) {
          // GPS yo'qolgan — markerni olib tashlash
          this.map.removeLayer(this.markers[driver.id]);
          delete this.markers[driver.id];
        }
      });

    } catch (err) {
      console.error('[DriverMap] Xatolik:', err);
    }
  },

  parseLocation(loc) {
    if (!loc) return null;
    try {
      if (typeof loc === 'object') {
        const lat = loc.y || loc.lat;
        const lng = loc.x || loc.lng;
        if (lat && lng) return [lat, lng];
      }
      if (typeof loc === 'string') {
        if (loc.trim().startsWith('{')) {
          const parsed = JSON.parse(loc);
          return [parsed.y || parsed.lat, parsed.x || parsed.lng];
        }
        if (loc.includes(',')) {
          const clean = loc.replace(/[()]/g, '');
          const parts = clean.split(',').map(Number);
          // PostgreSQL point: (lng, lat) — swap to [lat, lng]
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return [parts[1], parts[0]];
          }
        }
      }
    } catch (e) {}
    return null;
  },

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
};

window.DriverMap = DriverMap;
