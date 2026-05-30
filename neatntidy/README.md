# 🚿 Neat n Tidy Car Wash – Booking App

A clean, mobile-friendly car wash booking web app for **Neat n Tidy Car Wash**, Stellenbosch.

---

## Features

### Customer side
- Browse pricing (1 car R100 · 2 cars R180 · 3 cars R250 · monthly R350)
- Book a wash: contact details, date, time slot, location, package, payment method
- Instant booking confirmation with reference number
- Pre-filled WhatsApp message sent straight to the business

### Admin dashboard
- Live stats: total bookings, pending, confirmed, revenue
- View all bookings with customer details
- Accept / Decline pending bookings
- Mark confirmed bookings as completed
- One-tap WhatsApp button per customer (pre-filled message)
- Filter bookings by status
- Export all bookings as CSV

### Design
- Stellenbosch / Neat n Tidy branding
- Mobile-first responsive layout
- Floating WhatsApp button on every page
- Accessible markup (ARIA labels, roles)

---

## Project Structure

```
neat-n-tidy/
├── public/
│   ├── index.html      # App shell & all HTML
│   ├── style.css       # All styles
│   └── app.js          # All JavaScript logic
├── server.js           # Optional Express server
├── package.json
└── README.md
```

---

## Quick Start (No server needed)

The app is a plain HTML/CSS/JS site. The simplest way to run it:

1. Unzip the project folder
2. Open `public/index.html` in any modern browser

That's it – no build step, no installation required.

---

## Option B – Run with Node.js (recommended for hosting)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# 1. Unzip and enter the project folder
cd neat-n-tidy

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

For development with auto-reload on file changes:

```bash
npm run dev
```

---

## Configuration

All business settings live at the top of `public/app.js` in the `CONFIG` object:

```js
const CONFIG = {
  WA_NUMBER:     '27717398521',        // ← Your WhatsApp number (no + or spaces)
  BUSINESS_NAME: 'Neat n Tidy Car Wash',
  SERVICE_AREA:  'Stellenbosch and surrounding areas',
  CURRENCY:      'R',

  PRICING: {
    car1:    { label: '1 Car Wash',         price: 100 },
    car2:    { label: '2 Cars Wash',        price: 180 },
    car3:    { label: '3 Cars Wash',        price: 250 },
    monthly: { label: 'Monthly (4 washes)', price: 350 },
  },

  TIME_SLOTS: [
    '07:00 – 08:00', '08:00 – 09:00', /* ... */
  ],
};
```

Change any value and save – no rebuild needed.

---

## Deployment Options

### 1. Netlify (free, recommended)
1. Go to [netlify.com](https://netlify.com) and sign up
2. Click **Add new site → Deploy manually**
3. Drag and drop the `public/` folder onto the Netlify dashboard
4. Your site is live in seconds with a free URL

### 2. Vercel (free)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` from the project root and follow the prompts
3. Set the **Output Directory** to `public`

### 3. GitHub Pages (free)
1. Push the project to a GitHub repository
2. Go to **Settings → Pages**
3. Set **Source** to the `main` branch and folder to `/public`
4. GitHub will publish your site at `https://yourusername.github.io/repo-name`

### 4. Shared hosting / cPanel
Upload the contents of the `public/` folder to your `public_html` directory via FTP.

### 5. VPS / Cloud (Render, Railway, Fly.io)
Use the included `server.js` Express server. Most platforms detect `package.json` automatically.
Set the start command to `npm start` and the port to `3000` (or use the `PORT` environment variable).

---

## Connecting a Real Database (Next Steps)

Currently bookings are stored **in memory** and reset on page refresh.
To persist data, replace the `state.bookings` array with one of these:

| Option | Effort | Cost |
|---|---|---|
| [Firebase Firestore](https://firebase.google.com) | Low | Free tier |
| [Supabase](https://supabase.com) | Low | Free tier |
| [Airtable](https://airtable.com) | Very low | Free tier |
| MongoDB + Express API | Medium | Free tier |

---

## WhatsApp Number

The business WhatsApp number is set to **+27 71 739 8521** throughout the app.
To change it, update `WA_NUMBER` in `public/app.js` and the three `href` attributes
in `public/index.html` that reference `https://wa.me/27717398521`.

---

## Browser Support

Works in all modern browsers: Chrome, Firefox, Safari, Edge (last 2 versions).
No build tools or transpilation required.

---

## License

Private / Unlicensed – for Neat n Tidy Car Wash internal use only.
