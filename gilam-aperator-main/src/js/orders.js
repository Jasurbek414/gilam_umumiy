// ─── ORDERS TAB — Tailwind CSS ───────────────────────────────────────────────

// ── Status config ────────────────────────────────────────────────────────────
const ORDER_STATUSES = {
  NEW:              { label: 'Yangi',               emoji: '🆕', badge: 'bg-slate-800/80 text-slate-300 ring-slate-700/50' },
  DRIVER_ASSIGNED:  { label: 'Haydovchi kutilyapti', emoji: '🚗', badge: 'bg-amber-950/50 text-amber-400 ring-amber-900/50' },
  PICKED_UP:        { label: 'Olib ketildi',         emoji: '📦', badge: 'bg-orange-950/50 text-orange-400 ring-orange-900/50' },
  AT_FACILITY:      { label: 'Korxonada',            emoji: '🏭', badge: 'bg-yellow-950/50 text-yellow-400 ring-yellow-900/50' },
  WASHING:          { label: 'Yuvilmoqda',           emoji: '🧺', badge: 'bg-blue-950/50 text-blue-400 ring-blue-900/50' },
  DRYING:           { label: 'Quritilmoqda',         emoji: '💨', badge: 'bg-fuchsia-950/50 text-fuchsia-400 ring-fuchsia-900/50' },
  FINISHED:         { label: 'Tayyor',               emoji: '✅', badge: 'bg-purple-950/50 text-purple-400 ring-purple-900/50' },
  OUT_FOR_DELIVERY: { label: 'Yetkazilmoqda',        emoji: '🛵', badge: 'bg-indigo-950/50 text-indigo-400 ring-indigo-900/50' },
  DELIVERED:        { label: 'Yetkazildi',           emoji: '🎉', badge: 'bg-emerald-950/50 text-emerald-400 ring-emerald-900/50' },
  CANCELLED:        { label: 'Bekor qilingan',       emoji: '❌', badge: 'bg-red-950/50 text-red-400 ring-red-900/50' },
};

// ── State ────────────────────────────────────────────────────────────────────
let allOrders = [];
let ordersFilterStatus = 'ALL';
let ordersSearchQuery   = '';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoney(val) {
  return Number(val || 0).toLocaleString('uz-UZ') + " so'm";
}

// ── Load from API ─────────────────────────────────────────────────────────────
async function loadOrders() {
  if (!window.Api || !window.Api.config.currentUser?.companyId) return;

  const list = document.getElementById('orders-list');
  if (list) {
    list.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20" style="color:var(--t3);">
        <span class="material-icons-round text-[48px] mb-3 animate-spin" style="animation-duration:1.2s; color:var(--accent);">refresh</span>
        <p class="font-semibold text-sm">Yuklanmoqda...</p>
      </div>`;
  }

  try {
    const raw = await window.Api.request(
      `/orders/company/${window.Api.config.currentUser.companyId}`
    ) || [];
    
    // Security safeguard: explicitly filter by operator's company ID in the frontend
    const currentCompanyId = window.Api.config.currentUser.companyId;
    allOrders = raw.filter(o => o.companyId === currentCompanyId);
    
    renderOrders();
    renderStatsRow();
  } catch (err) {
    console.error('[Orders] Load error:', err);
    if (list) {
      list.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20" style="color:var(--red);">
          <span class="material-icons-round text-[48px] mb-3">error_outline</span>
          <p class="font-semibold text-sm">Yuklashda xatolik yuz berdi</p>
          <p class="text-xs mt-1" style="color:var(--t3);">${err.message || ''}</p>
        </div>`;
    }
  }
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function renderStatsRow() {
  const row = document.getElementById('orders-stats-row');
  if (!row) return;

  const total     = allOrders.length;
  const active    = allOrders.filter(o => !['DELIVERED','CANCELLED'].includes(o.status)).length;
  const delivered = allOrders.filter(o => o.status === 'DELIVERED').length;
  const cancelled = allOrders.filter(o => o.status === 'CANCELLED').length;

  const card = (icon, label, value, colorClass) => `
    <div class="flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm border" style="background:var(--bg-1); border-color:var(--border);">
      <div class="w-9 h-9 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0">
        <span class="material-icons-round text-white text-[18px]">${icon}</span>
      </div>
      <div>
        <p class="text-xl font-black leading-none" style="color:var(--t1);">${value}</p>
        <p class="text-[10px] font-semibold mt-1" style="color:var(--t3); text-transform: uppercase; letter-spacing: 0.04em;">${label}</p>
      </div>
    </div>`;

  row.innerHTML =
    card('assignment', 'Jami', total,     'bg-indigo-500/80') +
    card('pending',    'Faol', active,    'bg-amber-500/80') +
    card('check_circle','Yetkazildi',      delivered, 'bg-emerald-500/80') +
    card('cancel',     'Bekor qilingan',   cancelled, 'bg-red-500/80');
}

// ── Render list ───────────────────────────────────────────────────────────────
function renderOrders() {
  const container = document.getElementById('orders-list');
  if (!container) return;

  // Filter
  let filtered = allOrders;
  if (ordersFilterStatus !== 'ALL') {
    filtered = filtered.filter(o => o.status === ordersFilterStatus);
  }
  if (ordersSearchQuery) {
    const q = ordersSearchQuery.toLowerCase();
    filtered = filtered.filter(o =>
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.customer?.fullName && o.customer.fullName.toLowerCase().includes(q)) ||
      (o.customer?.phone1 && o.customer.phone1.includes(q))
    );
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20" style="color:var(--t3);">
        <span class="material-icons-round mb-3" style="font-size:48px; opacity:0.2;">assignment_late</span>
        <p class="font-semibold text-sm">Buyurtmalar topilmadi</p>
        <p class="text-xs mt-1">Qidiruv yoki filtr shartlarini o'zgartiring</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(order => orderCard(order)).join('');
}

// ── Single order card (Compact List Item View) ────────────────────────────────
function orderCard(order) {
  const shortId  = (order.id || '').split('-')[0].substring(0, 8).toUpperCase() || 'N/A';
  const st       = ORDER_STATUSES[order.status] || { label: order.status, emoji: '❓', badge: 'bg-slate-800 text-slate-300 ring-slate-700/50' };
  const name     = order.customer?.fullName || "Noma'lum";
  const phone    = order.customer?.phone1   || '—';
  const amount   = fmtMoney(order.totalAmount);
  const itemsQty = order.items?.length || 0;

  // Determine urgency highlight (vertical left border)
  let urgencyClass = 'border-l-[4px] border-transparent';
  if (order.deliveryDate && order.status !== 'DELIVERED') {
    const diff = new Date(order.deliveryDate) - Date.now();
    if (diff < 0) {
      urgencyClass = 'border-l-[4px] border-red-500';
    } else if (diff < 3 * 3600 * 1000) {
      urgencyClass = 'border-l-[4px] border-amber-400';
    }
  }

  return `
    <div onclick="showOrderDetails('${order.id}')" 
         class="group relative flex items-center justify-between gap-4 p-2.5 rounded-xl border cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--bg-2)] transition-all duration-150 ${urgencyClass}"
         style="background:var(--bg-1); border-color:var(--border);">
      
      <!-- ID & Date -->
      <div class="flex items-center gap-3 min-w-[120px]">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--accent-bg)] group-hover:scale-105 transition-transform">
          <span class="material-icons-round text-[15px]" style="color:var(--accent-h);">receipt_long</span>
        </div>
        <div>
          <span class="text-xs font-black tracking-tight" style="color:var(--t1);">#${shortId}</span>
          <p class="text-[10px] font-medium mt-0.5" style="color:var(--t3);">${formatDate(order.createdAt)} ${formatTime(order.createdAt)}</p>
        </div>
      </div>

      <!-- Customer Name & Phone -->
      <div class="flex-1 min-w-[150px] truncate">
        <div class="flex items-center gap-1.5">
          <span class="material-icons-round text-[13px]" style="color:var(--accent-h);">person</span>
          <span class="font-semibold text-xs" style="color:var(--t1);">${escapeHtml(name)}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="material-icons-round text-[13px]" style="color:var(--accent-h);">phone</span>
          <span class="text-[10px] font-medium" style="color:var(--t2);">${escapeHtml(phone)}</span>
        </div>
      </div>

      <!-- Services summary -->
      <div class="hidden sm:block text-right min-w-[80px]">
        <span class="text-[11px] font-bold" style="color:var(--t2);">${itemsQty} ta xizmat</span>
        <p class="text-[9px] mt-0.5" style="color:var(--t3);">Soni/O'lchami</p>
      </div>

      <!-- Status badge -->
      <div class="min-w-[130px] flex justify-center">
        <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${st.badge}">
          <span>${st.emoji}</span>
          <span>${st.label}</span>
        </span>
      </div>

      <!-- Price -->
      <div class="text-right min-w-[95px]">
        <span class="font-black text-xs" style="color:var(--green);">${amount}</span>
      </div>

      <!-- View details indicator -->
      <div class="text-[var(--t3)] group-hover:text-[var(--accent)] transition-colors pl-1">
        <span class="material-icons-round text-[18px]">chevron_right</span>
      </div>

    </div>
  `;
}

// ── Detail Modal Viewer ──────────────────────────────────────────────────────
async function showOrderDetails(orderId) {
  const modal = document.getElementById('modal-order-details');
  const content = document.getElementById('order-details-content');
  if (!modal || !content) return;

  // Set loading state
  content.innerHTML = `
    <div class="flex flex-col items-center justify-center py-10" style="color:var(--t3);">
      <span class="material-icons-round text-[36px] mb-2 animate-spin" style="color:var(--accent);">refresh</span>
      <p class="text-xs">Yuklanmoqda...</p>
    </div>`;
  modal.style.display = 'flex';

  try {
    const order = await window.Api.request(`/orders/${orderId}`);
    if (!order) throw new Error("Buyurtma topilmadi");

    const shortId = (order.id || '').split('-')[0].substring(0, 8).toUpperCase() || 'N/A';
    const st = ORDER_STATUSES[order.status] || { label: order.status, emoji: '❓', badge: 'bg-slate-800 text-slate-300 ring-slate-700/50' };
    const arrivedAt = fmtDateTime(order.createdAt);
    const deliverAt = order.deliveryDate ? fmtDateTime(order.deliveryDate) : 'Kiritilmagan';
    const name = order.customer?.fullName || "Noma'lum";
    const phone = order.customer?.phone1 || '—';
    const phone2 = order.customer?.phone2 || '—';
    const address = order.customer?.address || '—';
    const notes = order.notes || '';
    const amount = fmtMoney(order.totalAmount);
    
    // Items table/rows
    let itemsHTML = '';
    if (order.items && order.items.length > 0) {
      itemsHTML = `
        <div class="mt-4">
          <p class="text-[11px] font-bold uppercase tracking-wider mb-2" style="color:var(--t3);">Xizmatlar ro'yxati</p>
          <div class="border rounded-xl overflow-hidden" style="border-color:var(--border); background:var(--bg-2);">
            <table class="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr class="border-b font-semibold" style="border-color:var(--border); background:var(--bg-0);">
                  <th class="p-2.5" style="color:var(--t1);">Xizmat turi</th>
                  <th class="p-2.5 text-center" style="color:var(--t1);">O'lchamlari</th>
                  <th class="p-2.5 text-center" style="color:var(--t1);">Soni</th>
                  <th class="p-2.5 text-right" style="color:var(--t1);">Narxi</th>
                </tr>
              </thead>
              <tbody class="divide-y" style="divide-color:var(--border);">
                ${order.items.map(it => {
                  const dims = it.width && it.length ? `${it.width} × ${it.length} m` : '—';
                  const qty = it.width && it.length ? `${(it.width * it.length).toFixed(2)} m²` : `${it.quantity} ta`;
                  return `
                    <tr style="border-color:var(--border);">
                      <td class="p-2.5" style="color:var(--t2);">
                        <span class="font-semibold" style="color:var(--t1);">${escapeHtml(it.service?.name || 'Xizmat')}</span>
                        ${it.barcode ? `<div class="text-[9px] mt-0.5" style="color:var(--t3);">Shtrix-kod: ${it.barcode}</div>` : ''}
                      </td>
                      <td class="p-2.5 text-center" style="color:var(--t2);">${dims}</td>
                      <td class="p-2.5 text-center font-medium" style="color:var(--t1);">${qty}</td>
                      <td class="p-2.5 text-right font-bold" style="color:var(--green);">${fmtMoney(it.totalPrice)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      itemsHTML = `
        <div class="p-4 text-center border rounded-xl" style="border-color:var(--border); color:var(--t3);">
          Xizmatlar kiritilmagan
        </div>`;
    }

    content.innerHTML = `
      <div class="space-y-4">
        
        <!-- Header Info -->
        <div class="flex items-center justify-between border-b pb-3" style="border-color:var(--border);">
          <div>
            <p class="text-[10px] font-semibold" style="color:var(--t3);">Buyurtma ID</p>
            <p class="text-sm font-black" style="color:var(--t1);">#${shortId}</p>
            <p class="text-[9px] font-medium" style="color:var(--t3);">${order.id}</p>
          </div>
          <div class="text-right">
            <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-full ring-1 ${st.badge}">
              <span>${st.emoji}</span>
              <span>${st.label}</span>
            </span>
          </div>
        </div>

        <!-- Customer & Delivery Grid -->
        <div class="grid grid-cols-2 gap-4 text-xs">
          <!-- Customer info -->
          <div class="space-y-2 border-r pr-3" style="border-color:var(--border);">
            <p class="text-[10px] font-bold uppercase tracking-wider" style="color:var(--t3);">Mijoz ma'lumotlari</p>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-[14px]" style="color:var(--accent-h);">person</span>
                <strong style="color:var(--t1);">${escapeHtml(name)}</strong>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-[14px]" style="color:var(--accent-h);">phone</span>
                <span style="color:var(--t2);">${escapeHtml(phone)}</span>
              </div>
              ${phone2 && phone2 !== '—' ? `
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-[14px]" style="color:var(--accent-h);">phone</span>
                <span style="color:var(--t2);">${escapeHtml(phone2)}</span>
              </div>` : ''}
              <div class="flex items-start gap-2">
                <span class="material-icons-round text-[14px] mt-0.5" style="color:var(--accent-h);">location_on</span>
                <span class="leading-tight text-[11px]" style="color:var(--t2);">${escapeHtml(address)}</span>
              </div>
            </div>
          </div>

          <!-- Timeline info -->
          <div class="space-y-2 pl-1">
            <p class="text-[10px] font-bold uppercase tracking-wider" style="color:var(--t3);">Buyurtma vaqtlari</p>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-[14px] text-emerald-400">login</span>
                <span style="color:var(--t2);">Kelgan: <strong style="color:var(--t1);">${arrivedAt}</strong></span>
              </div>
              <div class="flex items-center gap-2">
                <span class="material-icons-round text-[14px] text-amber-400">logout</span>
                <span style="color:var(--t2);">Kutilyapti: <strong style="color:var(--t1);">${deliverAt}</strong></span>
              </div>
              ${order.driver ? `
              <div class="flex items-center gap-2 mt-2 pt-2 border-t" style="border-color:var(--border);">
                <span class="material-icons-round text-[14px]" style="color:var(--accent-h);">local_shipping</span>
                <span style="color:var(--t2);">Haydovchi: <strong style="color:var(--t1);">${escapeHtml(order.driver.fullName)}</strong></span>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${notes ? `
        <div class="p-3 rounded-xl border text-xs" style="background:var(--bg-2); border-color:var(--border);">
          <div class="flex items-center gap-1.5 font-bold mb-1" style="color:var(--t2);">
            <span class="material-icons-round text-[15px]" style="color:var(--t3);">notes</span> Izoh
          </div>
          <p class="italic leading-normal text-[11px]" style="color:var(--t2);">${escapeHtml(notes)}</p>
        </div>` : ''}

        <!-- Order Items -->
        ${itemsHTML}

        <!-- Summary Footer -->
        <div class="flex items-center justify-between pt-3 border-t text-xs font-bold" style="border-color:var(--border);">
          <span style="color:var(--t1);">Umumiy summa:</span>
          <span class="text-sm font-black" style="color:var(--green);">${amount}</span>
        </div>

      </div>
    `;
  } catch (err) {
    console.error('[Orders] Load detail error:', err);
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center py-10" style="color:var(--red);">
        <span class="material-icons-round text-[36px] mb-2">error_outline</span>
        <p class="font-semibold text-xs">Tafsilotlarni yuklashda xatolik yuz berdi</p>
        <p class="text-[10px] mt-1" style="color:var(--t3);">${err.message || ''}</p>
      </div>`;
  }
}

// ── Escape HTML helper ────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init UI bindings ──────────────────────────────────────────────────────────
function initOrdersUI() {
  const refreshBtn = document.getElementById('btn-refresh-orders');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadOrders();
      if (window.Utils) Utils.showToast('Buyurtmalar yangilandi', 'info');
    });
  }

  const searchInput = document.getElementById('orders-search');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', function () {
      clearTimeout(timeout);
      ordersSearchQuery = this.value.trim();
      timeout = setTimeout(renderOrders, 300);
    });
  }

  const statusFilter = document.getElementById('orders-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function () {
      ordersFilterStatus = this.value;
      renderOrders();
    });
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.loadOrders   = loadOrders;
window.initOrdersUI = initOrdersUI;
window.formatTime   = formatTime;
window.formatDate   = formatDate;
window.showOrderDetails = showOrderDetails;

// Real-time socket.io update handler (order:new / order:updated)
document.addEventListener('DOMContentLoaded', () => {
  if (window.UI) {
    window.UI.refreshOrders = loadOrders;
  }
});
