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
async function submitBooking() {
    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const bdate = document.getElementById('bdate').value;
    const btime = document.getElementById('btime').value;
    const location = document.getElementById('location').value.trim();

    // Basic validation
    const errors = [];
    if (!fname) errors.push('First name');
    if (!lname) errors.push('Last name');
    if (!phone) errors.push('Phone number');
    if (!bdate) errors.push('Date');
    if (!btime) errors.push('Time slot');
    if (!location) errors.push('Location');

    if (errors.length) {
        alert('Please fill in: ' + errors.join(', '));
        return;
    }

    const svc = CONFIG.PRICING[state.selectedService];

    const booking = {
        name: fname + ' ' + lname,
        phone: phone,
        email: document.getElementById('email').value.trim(),
        date: bdate,
        time: btime,
        location: location,
        notes: document.getElementById('notes').value.trim(),
        service: svc.label,
        price: svc.price,
        payment: state.selectedPayment,
    };

    // Send to backend (Supabase)
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        const result = await response.json();
        
        if (result.success) {
            const savedBooking = result.booking;
            state.bookings.unshift(savedBooking);
            
            // Show success screen
            document.getElementById('booking-ref-code').textContent = savedBooking.id;
            document.getElementById('wa-confirm-link').href = WA(CONFIG.WA_NUMBER, buildWaMessage(savedBooking));
            document.getElementById('booking-form-wrapper').style.display = 'none';
            document.getElementById('success-screen').style.display = 'block';
            document.getElementById('success-screen').focus();
        } else {
            alert('Booking failed: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving booking:', error);
        alert('Network error. Please try again.');
    }
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
async function updateStatus(id, newStatus) {
    try {
        const response = await fetch(`/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        
        if (result.success) {
            // Update local state
            const booking = state.bookings.find(b => b.id == id);
            if (booking) booking.status = newStatus;
            renderAdmin();
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
    }
}

/* ── Admin: render ─────────────────────────────────────── */
async function renderAdmin() {
    // Fetch latest bookings from server
    try {
        const response = await fetch('/api/bookings');
        const bookings = await response.json();
        state.bookings = bookings;
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }

    const { bookings, currentFilter } = state;

    // Stats
    const pending = bookings.filter(b => b.status === 'pending').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const revenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + b.price, 0);

    document.getElementById('stat-total').textContent = bookings.length;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-confirmed').textContent = confirmed;
    document.getElementById('stat-revenue').textContent = fmt(revenue);

    // Filter
    const filtered = currentFilter === 'all'
        ? bookings
        : bookings.filter(b => b.status === currentFilter);

    const list = document.getElementById('booking-list');

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state" aria-live="polite">
                <i class="ti ti-calendar-off" aria-hidden="true"></i>
                <p>${bookings.length === 0 ? 'No bookings yet. Customer bookings will appear here.' : 'No bookings in this category.'}</p>
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
                        onclick="updateStatus(${b.id},'confirmed')">
                        <i class="ti ti-check" aria-hidden="true"></i>
                    </button>
                    <button class="action-btn decline" title="Decline booking" aria-label="Decline booking for ${escapeHtml(b.name)}"
                        onclick="updateStatus(${b.id},'declined')">
                        <i class="ti ti-x" aria-hidden="true"></i>
                    </button>` : ''}
                ${b.status === 'confirmed' ? `
                    <button class="action-btn done" title="Mark as completed" aria-label="Mark ${escapeHtml(b.name)}'s booking as completed"
                        onclick="updateStatus(${b.id},'completed')">
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

/* ===== REVIEWS SYSTEM ===== */

// ===== Helper: Generate Consistent Color from Name =====
function getColorFromName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 65%, 55%)`;
}

// ===== Helper: Get Initials =====
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ===== Load Reviews =====
async function loadReviews() {
    try {
        const response = await fetch('/api/reviews');
        const reviews = await response.json();
        renderReviews(reviews);
        initCarousel();
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// ===== Render Reviews =====
function renderReviews(reviews) {
    const track = document.getElementById('reviewsTrack');
    if (!track) return;

    if (!reviews || reviews.length === 0) {
        track.innerHTML = `
            <div class="review-card" style="min-width:100%; text-align:center; padding:40px;">
                <p style="color:#999; font-size:16px;">No reviews yet. Be the first to share your experience!</p>
            </div>
        `;
        return;
    }

    track.innerHTML = reviews.map(review => {
        const initials = getInitials(review.customer_name);
        const bgColor = getColorFromName(review.customer_name);
        const formattedDate = review.review_date ? new Date(review.review_date).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : '';

        const stars = '⭐'.repeat(Math.min(review.rating || 5, 5));

        let avatarHtml = '';
        if (review.profile_photo_url) {
            avatarHtml = `<img src="${review.profile_photo_url}" alt="${review.customer_name}" loading="lazy" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style="background:${bgColor}; color:white; font-weight:600; font-size:20px; width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius:50%;">${initials}</span>';">`;
        } else {
            avatarHtml = `<span style="background:${bgColor}; color:white; font-weight:600; font-size:20px; width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius:50%;">${initials}</span>`;
        }

        return `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-avatar">${avatarHtml}</div>
                    <div class="review-name-date">
                        <span class="review-name">${escapeHtml(review.customer_name)}</span>
                        <span class="review-date">${formattedDate || 'Recently'}</span>
                    </div>
                </div>
                <div class="review-stars">${stars}</div>
                <p class="review-text">"${escapeHtml(review.review_text)}"</p>
            </div>
        `;
    }).join('');
}

// ===== Carousel Logic =====
let currentSlide = 0;
let slideInterval = null;
const AUTOPLAY_DELAY = 5000;

function initCarousel() {
    const track = document.getElementById('reviewsTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const dotsContainer = document.getElementById('carouselDots');

    if (!track || !prevBtn || !nextBtn) return;

    const cards = track.querySelectorAll('.review-card');
    if (cards.length <= 1) {
        // Hide controls if few reviews
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    let visibleCount = getVisibleCount();
    const totalSlides = Math.max(0, cards.length - visibleCount);

    function getVisibleCount() {
    const total = document.querySelectorAll('.review-card').length;
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 992) return Math.min(2, total);
    return Math.min(3, total);
}

    function updateCarousel() {
        const maxSlide = Math.max(0, cards.length - visibleCount);
        if (currentSlide > maxSlide) currentSlide = maxSlide;
        if (currentSlide < 0) currentSlide = 0;

        const cardWidth = cards[0].offsetWidth + 20;
        const offset = currentSlide * (cardWidth);
        track.style.transform = `translateX(-${offset}px)`;

        // Update dots
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function goToSlide(index) {
        const maxSlide = Math.max(0, cards.length - visibleCount);
        if (index < 0) index = maxSlide;
        if (index > maxSlide) index = 0;
        currentSlide = index;
        updateCarousel();
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    // Create dots
    const dotCount = Math.max(1, cards.length - visibleCount + 1);
    dotsContainer.innerHTML = '';
    for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('button');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => {
            goToSlide(i);
            resetAutoplay();
        });
        dotsContainer.appendChild(dot);
    }

    // Event listeners
    prevBtn.addEventListener('click', () => {
        prevSlide();
        resetAutoplay();
    });

    nextBtn.addEventListener('click', () => {
        nextSlide();
        resetAutoplay();
    });

    // Window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            visibleCount = getVisibleCount();
            // Recreate dots
            const newDotCount = Math.max(1, cards.length - visibleCount + 1);
            const dots = dotsContainer.querySelectorAll('.dot');
            if (dots.length !== newDotCount) {
                initCarousel(); // Re-init if dot count changed
                return;
            }
            updateCarousel();
        }, 300);
    });

    // Autoplay
    function startAutoplay() {
        stopAutoplay();
        slideInterval = setInterval(nextSlide, AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }
    }

    function resetAutoplay() {
        startAutoplay();
    }

    // Pause on hover
    const carousel = document.querySelector('.reviews-carousel-wrapper');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoplay);
        carousel.addEventListener('mouseleave', startAutoplay);
    }

    // Initial update
    setTimeout(updateCarousel, 100);
    startAutoplay();
}

// ===== REVIEW SUBMISSION =====

// Open modal
document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openReviewForm');
    const modal = document.getElementById('reviewModal');
    const closeBtn = document.getElementById('closeReviewForm');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Close on overlay click
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Star rating
    const stars = document.querySelectorAll('.star-rating span');
    const ratingInput = document.getElementById('reviewRatingInput');
    let selectedRating = 5;

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            ratingInput.value = selectedRating;
            stars.forEach(s => {
                s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating);
            });
        });
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.value);
            stars.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= val ? '#f5b342' : '#ddd';
            });
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => {
                s.style.color = parseInt(s.dataset.value) <= selectedRating ? '#f5b342' : '#ddd';
            });
        });
    });

    // Set initial rating
    stars.forEach(s => {
        if (parseInt(s.dataset.value) <= 5) {
            s.classList.add('active');
            s.style.color = '#f5b342';
        }
    });

    // Photo preview
    const photoInput = document.getElementById('reviewPhoto');
    const photoPreview = document.getElementById('photoPreview');

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    photoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            } else {
                photoPreview.innerHTML = '<span class="photo-placeholder">📷</span>';
            }
        });
    }

    // Form submission
    const form = document.getElementById('reviewForm');
    const messageEl = document.getElementById('reviewFormMessage');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitReviewBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            messageEl.style.display = 'none';
            messageEl.className = 'form-message';

            const name = document.getElementById('reviewName').value.trim();
            const text = document.getElementById('reviewText').value.trim();
            const rating = parseInt(document.getElementById('reviewRatingInput').value);

            if (!name || !text) {
                messageEl.textContent = 'Please fill in all required fields.';
                messageEl.className = 'form-message error';
                messageEl.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Review';
                return;
            }

            try {
                let photoUrl = null;
                const photoFile = document.getElementById('reviewPhoto').files[0];

                // Upload photo if selected
                if (photoFile) {
                    const formData = new FormData();
                    formData.append('file', photoFile);
                    const uploadRes = await fetch('/api/upload-photo', {
                        method: 'POST',
                        body: formData
                    });
                    const uploadResult = await uploadRes.json();
                    if (uploadResult.success) {
                        photoUrl = uploadResult.url;
                    } else {
                        messageEl.textContent = 'Photo upload failed: ' + uploadResult.error;
                        messageEl.className = 'form-message error';
                        messageEl.style.display = 'block';
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit Review';
                        return;
                    }
                }

                // Submit review
                const response = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_name: name,
                        review_text: text,
                        rating: rating,
                        profile_photo_url: photoUrl
                    })
                });

                const result = await response.json();

                if (result.success) {
                    messageEl.textContent = '✅ Thank you! Your review has been submitted and is pending approval.';
                    messageEl.className = 'form-message success';
                    messageEl.style.display = 'block';
                    form.reset();
                    photoPreview.innerHTML = '<span class="photo-placeholder">📷</span>';
                    // Reset stars
                    selectedRating = 5;
                    document.getElementById('reviewRatingInput').value = 5;
                    stars.forEach(s => {
                        s.classList.add('active');
                        s.style.color = '#f5b342';
                    });
                    // Reload reviews after 3 seconds
                    setTimeout(() => {
                        loadReviews();
                        closeModal();
                    }, 3000);
                } else {
                    messageEl.textContent = '❌ Error: ' + result.error;
                    messageEl.className = 'form-message error';
                    messageEl.style.display = 'block';
                }
            } catch (error) {
                messageEl.textContent = '❌ Network error. Please try again.';
                messageEl.className = 'form-message error';
                messageEl.style.display = 'block';
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
        });
    }

    function closeModal() {
        const modal = document.getElementById('reviewModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Reset form message
        const messageEl = document.getElementById('reviewFormMessage');
        messageEl.style.display = 'none';
        messageEl.className = 'form-message';
    }

    // Load reviews on page load
    loadReviews();
});