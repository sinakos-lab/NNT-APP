/**
 * Neat n Tidy Car Wash – App Logic
 * ============================================================
 * Handles: navigation, booking form, admin dashboard,
 *          WhatsApp deep-links, CSV export.
 *
 * Configuration: update WA_NUMBER and BUSINESS_* constants
 * at the top of this file to customise for your business.
 */

'use strict';

/* ── Configuration ─────────────────────────────────────── */
const CONFIG = {
  WA_NUMBER:       '27717398521',       // WhatsApp number (no + or spaces)
  BUSINESS_NAME:   'Neat n Tidy Car Wash',
  SERVICE_AREA:    'Stellenbosch and surrounding areas',
  CURRENCY:        'R',

  PRICING: {
    car1:    { label: '1 Car Wash',          price: 100 },
    car2:    { label: '2 Cars Wash',         price: 180 },
    car3:    { label: '3 Cars Wash',         price: 250 },
    monthly: { label: 'Monthly (4 washes)',  price: 350 },
  },

  TIME_SLOTS: [
    '07:00 – 08:00','08:00 – 09:00','09:00 – 10:00',
    '10:00 – 11:00','11:00 – 12:00','12:00 – 13:00',
    '13:00 – 14:00','14:00 – 15:00','15:00 – 16:00',
    '16:00 – 17:00',
  ],
};

/* ── State ─────────────────────────────────────────────── */
const state = {
  bookings:        [],
  selectedService: 'car1',
  selectedPayment: 'Cash',
  currentFilter:   'all',
};

/* ── Helpers ───────────────────────────────────────────── */
const $  = id => document.getElementById(id);
const WA = (number, msg) =>
  `https://wa.me/${number}${msg ? '?text=' + encodeURIComponent(msg) : ''}`;

function fmt(price) {
  return CONFIG.CURRENCY + price;
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function generateRef() {
  return 'NNT-' + String(state.bookings.length + 1).padStart(4, '0');
}

function buildWaMessage(b) {
  return [
    `Hi ${CONFIG.BUSINESS_NAME}! 👋`,
    '',
    `I've just made a booking:`,
    '',
    `📋 *Ref:* ${b.id}`,
    `👤 *Name:* ${b.name}`,
    `📞 *Phone:* ${b.phone}`,
    `📅 *Date:* ${b.date} at ${b.time}`,
    `📍 *Location:* ${b.location}`,
    `🚗 *Service:* ${b.service}`,
    `💰 *Price:* ${fmt(b.price)}`,
    `💳 *Payment:* ${b.payment}`,
    b.notes ? `📝 *Notes:* ${b.notes}` : '',
    '',
    'Please confirm my booking. Thank you!',
  ].filter(l => l !== undefined).join('\n');
}

/* ── Navigation ────────────────────────────────────────── */
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach((t, i) => {
        const ids = ['home', 'book', 'admin'];
        t.classList.toggle('active', ids[i] === id);
        t.setAttribute('aria-current', ids[i] === id ? 'page' : 'false');
    });
    const sec = document.getElementById('sec-' + id);
    if (sec) sec.classList.add('active');

    // PASSWORD PROTECTION FOR ADMIN
    if (id === 'admin') {
        // Check if already logged in
        if (sessionStorage.getItem('adminLoggedIn') === 'true') {
            renderAdmin();
        } else {
            const password = prompt('Enter admin password:');
            if (password === 'admin123') {
                sessionStorage.setItem('adminLoggedIn', 'true');
                renderAdmin();
            } else {
                alert('Incorrect password');
                // Go back to home section
                document.getElementById('sec-home').classList.add('active');
                document.querySelectorAll('.nav-tab').forEach((t, i) => {
                    t.classList.toggle('active', i === 0);
                });
            }
        }
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

/* ── Service selection ─────────────────────────────────── */
function selectCars(n) {
  const key = 'car' + n;
  state.selectedService = key;

  // Clear monthly pkg selection
  $('pkg-monthly').classList.remove('selected');
  $('pkg-monthly').setAttribute('aria-pressed', 'false');

  // Update car buttons
  document.querySelectorAll('.car-btn').forEach((btn, i) => {
    const selected = i + 1 === n;
    btn.classList.toggle('selected', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });

  updateSummary();
}

function selectPkg() {
  state.selectedService = 'monthly';

  // Clear car buttons
  document.querySelectorAll('.car-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-pressed', 'false');
  });

  $('pkg-monthly').classList.add('selected');
  $('pkg-monthly').setAttribute('aria-pressed', 'true');
  updateSummary();
}

function selectPay(btn, method) {
  state.selectedPayment = method;
  document.querySelectorAll('.pay-btn').forEach(b => {
    b.classList.remove('selected');
    b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('selected');
  btn.setAttribute('aria-pressed', 'true');
  $('sum-pay').textContent = method;
}

/* ── Summary ───────────────────────────────────────────── */
function updateSummary() {
  const svc = CONFIG.PRICING[state.selectedService];
  $('sum-service').textContent = svc.label;
  $('sum-total').textContent   = fmt(svc.price);

  const dateVal = $('bdate').value;
  const timeVal = $('btime').value;
  $('sum-date').textContent = dateVal && timeVal
    ? `${dateVal} · ${timeVal}`
    : (dateVal || 'Not selected');
}

/* ── Booking submission ────────────────────────────────── */
function submitBooking() {
  const fname    = $('fname').value.trim();
  const lname    = $('lname').value.trim();
  const phone    = $('phone').value.trim();
  const bdate    = $('bdate').value;
  const btime    = $('btime').value;
  const location = $('location').value.trim();

  // Basic validation
  const errors = [];
  if (!fname)    errors.push('First name');
  if (!lname)    errors.push('Last name');
  if (!phone)    errors.push('Phone number');
  if (!bdate)    errors.push('Date');
  if (!btime)    errors.push('Time slot');
  if (!location) errors.push('Location');

  if (errors.length) {
    alert('Please fill in: ' + errors.join(', '));
    return;
  }

  const svc = CONFIG.PRICING[state.selectedService];
  const ref = generateRef();

  const booking = {
    id:       ref,
    name:     `${fname} ${lname}`,
    phone,
    email:    $('email').value.trim(),
    date:     bdate,
    time:     btime,
    location,
    notes:    $('notes').value.trim(),
    service:  svc.label,
    price:    svc.price,
    payment:  state.selectedPayment,
    status:   'pending',
    created:  new Date().toISOString(),
  };

  state.bookings.unshift(booking);

  // Update success screen
  $('booking-ref-code').textContent = ref;
  $('wa-confirm-link').href = WA(CONFIG.WA_NUMBER, buildWaMessage(booking));

  // Show success
  $('booking-form-wrapper').style.display = 'none';
  $('success-screen').style.display       = 'block';
  $('success-screen').focus();
}

function resetBooking() {
  // Clear inputs
  ['fname','lname','phone','email','location','notes'].forEach(id => {
    $(id).value = '';
  });
  $('bdate').value = '';
  $('btime').value = '';

  // Reset service
  selectCars(1);

  // Reset payment
  const firstPayBtn = document.querySelector('.pay-btn');
  if (firstPayBtn) selectPay(firstPayBtn, 'Cash');

  updateSummary();

  $('booking-form-wrapper').style.display = 'block';
  $('success-screen').style.display       = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Admin: status updates ─────────────────────────────── */
function updateStatus(id, newStatus) {
  const booking = state.bookings.find(b => b.id === id);
  if (booking) {
    booking.status = newStatus;
    renderAdmin();
  }
}

/* ── Admin: render ─────────────────────────────────────── */
function renderAdmin() {
  const { bookings, currentFilter } = state;

  // Stats
  const pending   = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const revenue   = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + b.price, 0);

  $('stat-total').textContent   = bookings.length;
  $('stat-pending').textContent = pending;
  $('stat-confirmed').textContent = confirmed;
  $('stat-revenue').textContent = fmt(revenue);

  // Filter
  const filtered = currentFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === currentFilter);

  const list = $('booking-list');

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state" aria-live="polite">
        <i class="ti ti-calendar-off" aria-hidden="true"></i>
        <p>${bookings.length === 0
          ? 'No bookings yet. Customer bookings will appear here.'
          : 'No bookings in this category.'
        }</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(b => `
    <div class="booking-item" role="listitem">
      <div class="booking-avatar" aria-hidden="true">${getInitials(b.name)}</div>
      <div class="booking-info">
        <div class="booking-name">
          ${escapeHtml(b.name)}
          <span class="status-badge status-${b.status}">${b.status}</span>
        </div>
        <div class="booking-meta">
          <span><i class="ti ti-phone" aria-hidden="true"></i>${escapeHtml(b.phone)}</span>
          <span><i class="ti ti-calendar" aria-hidden="true"></i>${b.date} · ${b.time}</span>
          <span><i class="ti ti-map-pin" aria-hidden="true"></i>${escapeHtml(b.location)}</span>
          <span><i class="ti ti-credit-card" aria-hidden="true"></i>${escapeHtml(b.payment)}</span>
        </div>
      </div>
      <span class="booking-pkg">${escapeHtml(b.service)}</span>
      <span class="booking-price">${fmt(b.price)}</span>
      <div class="booking-actions">
        ${b.status === 'pending' ? `
          <button class="action-btn accept" title="Accept booking" aria-label="Accept booking for ${escapeHtml(b.name)}"
            onclick="updateStatus('${b.id}','confirmed')">
            <i class="ti ti-check" aria-hidden="true"></i>
          </button>
          <button class="action-btn decline" title="Decline booking" aria-label="Decline booking for ${escapeHtml(b.name)}"
            onclick="updateStatus('${b.id}','declined')">
            <i class="ti ti-x" aria-hidden="true"></i>
          </button>` : ''}
        ${b.status === 'confirmed' ? `
          <button class="action-btn done" title="Mark as completed" aria-label="Mark ${escapeHtml(b.name)}'s booking as completed"
            onclick="updateStatus('${b.id}','completed')">
            <i class="ti ti-check-all" aria-hidden="true"></i>
          </button>` : ''}
        <a href="${WA(b.phone.replace(/\D/g,''), buildWaMessage(b))}"
          class="action-btn wa"
          title="WhatsApp ${escapeHtml(b.name)}"
          aria-label="WhatsApp ${escapeHtml(b.name)}"
          target="_blank" rel="noopener">
          <i class="ti ti-brand-whatsapp" aria-hidden="true"></i>
        </a>
      </div>
    </div>
  `).join('');
}

/* ── Admin: filter ─────────────────────────────────────── */
function filterBookings(status, btn) {
  state.currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAdmin();
}

/* ── Admin: export ─────────────────────────────────────── */
function exportBookings() {
  const headers = ['ID','Name','Phone','Email','Date','Time','Location','Service','Price','Payment','Status','Created'];
  const rows    = state.bookings.map(b => [
    b.id, b.name, b.phone, b.email, b.date, b.time,
    b.location, b.service, fmt(b.price), b.payment, b.status, b.created,
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`));

  const csv     = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `neat-n-tidy-bookings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Security helper ───────────────────────────────────── */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* ── Init ──────────────────────────────────────────────── */
(function init() {
  // Set date minimum to today
  const today = new Date().toISOString().split('T')[0];
  const bdateEl = $('bdate');
  if (bdateEl) bdateEl.min = today;

  // Populate time slots from config
  const btimeEl = $('btime');
  if (btimeEl) {
    btimeEl.innerHTML = '<option value="">Select a time slot</option>' +
      CONFIG.TIME_SLOTS.map(t => `<option>${t}</option>`).join('');
  }

  // Live summary update on date/time change
  ['bdate','btime'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', updateSummary);
  });

  // Initial summary
  updateSummary();

  // Initial admin render
  renderAdmin();
})();
