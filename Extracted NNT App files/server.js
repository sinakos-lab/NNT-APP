/**
 * Neat n Tidy Car Wash – Simple Express Server
 * ============================================================
 * Serves the static frontend from the /public directory.
 * Optional – the app also runs without this server by simply
 * opening public/index.html directly in a browser.
 *
 * Usage:
 *   npm install
 *   npm start            # production
 *   npm run dev          # with auto-reload (nodemon)
 */

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: serve index.html for any unmatched route (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚿 Neat n Tidy server running at http://localhost:${PORT}\n`);
});
