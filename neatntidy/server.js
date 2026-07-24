const express = require('express');
const path = require('path');

// Supabase setup
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');   // ← MOVE HERE
const axios = require('axios');     // ← MOVE HERE
const fileUpload = require('express-fileupload'); // ← MOVE HERE
// REPLACE THESE WITH YOUR ACTUAL VALUES
const SUPABASE_URL = 'https://eshllhjstguzvudoygxc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5SZkHoEukOKHGsyBtF4HXQ_mWeuBvdS';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const fileUpload = require('express-fileupload');
app.use(fileUpload());

// ===== PAYFAST HELPERS =====

function generatePayfastSignature(data, passphrase = '') {
    const sortedData = Object.keys(data)
        .filter(key => data[key] !== '' && data[key] !== undefined && data[key] !== null)
        .sort()
        .reduce((acc, key) => {
            acc[key] = data[key];
            return acc;
        }, {});

    const queryString = new URLSearchParams(sortedData).toString();
    const signingString = passphrase ? queryString + '&passphrase=' + passphrase : queryString;
    return crypto.createHash('md5').update(signingString).digest('hex');
}

// ===== PAYFAST =====


const PAYFAST_MERCHANT_ID = '36137633';   // ← Replace with yours
const PAYFAST_MERCHANT_KEY = 'uhwff77niomhm'; // ← Replace with yours
const PAYFAST_PASSPHRASE = ''; // ← Set if you have one

const PAYFAST_SANDBOX = true; // true = testing, false = live

const PAYFAST_URL = PAYFAST_SANDBOX
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

const PAYFAST_VALIDATE_URL = PAYFAST_SANDBOX
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';

// Save a new booking to Supabase
app.post('/api/bookings', async (req, res) => {
    try {
        const booking = req.body;
        const { data, error } = await supabase
            .from('bookings')
            .insert([booking])
            .select();
        
        if (error) throw error;
        res.json({ success: true, booking: data[0] });
    } catch (error) {
        console.error('Error saving booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all bookings (for admin)
app.get('/api/bookings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update booking status
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const { data, error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        res.json({ success: true, booking: data[0] });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/create-payment', async (req, res) => {
    try {
        const { booking_id, booking } = req.body;
        const amount = booking.price.toFixed(2);
        const orderId = 'NNT-' + booking_id + '-' + Date.now();

        const baseUrl = PAYFAST_SANDBOX
            ? 'https://nnnt-app.vercel.app'
            : 'https://nnnt-app.vercel.app';

        const pfData = {
            merchant_id: PAYFAST_MERCHANT_ID,
            merchant_key: PAYFAST_MERCHANT_KEY,
            return_url: baseUrl + '/payment-success',
            cancel_url: baseUrl + '/payment-cancel',
            notify_url: baseUrl + '/api/payment-itn',
            m_payment_id: orderId,
            amount: amount,
            item_name: `${booking.service} - ${booking.name}`,
            item_description: `Car wash booking for ${booking.name}`,
            email_address: booking.email || '',
            custom_int1: booking_id.toString(),
            custom_str1: booking.name,
            custom_str2: booking.phone,
        };

        pfData.signature = generatePayfastSignature(pfData, PAYFAST_PASSPHRASE);

        const { error } = await supabase
            .from('bookings')
            .update({
                status: 'payment_pending',
                order_id: orderId
            })
            .eq('id', booking_id);

        if (error) throw error;

        res.json({
            success: true,
            paymentUrl: PAYFAST_URL,
            payfastData: pfData
        });

    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== PAYFAST ITN =====

app.post('/api/payment-itn', async (req, res) => {
    try {
        const pfData = req.body;
        const signature = pfData.signature;
        delete pfData.signature;

        const ourSignature = generatePayfastSignature(pfData, PAYFAST_PASSPHRASE);

        if (signature !== ourSignature) {
            console.error('Invalid ITN signature');
            return res.status(400).send('Invalid signature');
        }

        const validateResponse = await axios.post(PAYFAST_VALIDATE_URL, pfData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (validateResponse.data !== 'VALID') {
            console.error('ITN validation failed:', validateResponse.data);
            return res.status(400).send('Invalid ITN');
        }

        const paymentStatus = pfData.payment_status;
        const bookingId = parseInt(pfData.custom_int1);

        if (paymentStatus === 'COMPLETE') {
            const { error } = await supabase
                .from('bookings')
                .update({
                    status: 'confirmed',
                    payment_id: pfData.pf_payment_id,
                    payment_date: new Date().toISOString()
                })
                .eq('id', bookingId);

            if (error) throw error;
            console.log(`✅ Payment COMPLETE for booking ${bookingId}`);
            return res.send('OK');

        } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'payment_failed' })
                .eq('id', bookingId);

            if (error) throw error;
            console.log(`❌ Payment ${paymentStatus} for booking ${bookingId}`);
            return res.send('OK');
        }

        res.send('OK');

    } catch (error) {
        console.error('Error processing ITN:', error);
        res.status(500).send('Error');
    }
});

// ===== REVIEWS API =====

// Get all approved reviews for display
app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Submit a new review
app.post('/api/reviews', async (req, res) => {
    try {
        const { customer_name, review_text, rating, profile_photo_url } = req.body;
        
        const { data, error } = await supabase
            .from('reviews')
            .insert([{
                customer_name,
                review_text,
                rating,
                profile_photo_url: profile_photo_url || null,
                status: 'pending' // Admin must approve first
            }])
            .select();
        
        if (error) throw error;
        res.json({ success: true, review: data[0] });
    } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Upload profile photo to Supabase Storage
app.post('/api/upload-photo', async (req, res) => {
    try {
        const { file } = req.files || {};
        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return res.status(400).json({ success: false, error: 'File too large (max 2MB)' });
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.mimetype)) {
            return res.status(400).json({ success: false, error: 'Only JPG, PNG, and WEBP are allowed' });
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;
        const filePath = `review-photos/${filename}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('review-photos')
            .upload(filePath, file.data, {
                contentType: file.mimetype
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('review-photos')
            .getPublicUrl(filePath);

        res.json({ success: true, url: urlData.publicUrl });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Get all reviews (including pending)
app.get('/api/admin/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Update review status (approve/reject)
app.put('/api/admin/reviews/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        
        const { data, error } = await supabase
            .from('reviews')
            .update({ status })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        res.json({ success: true, review: data[0] });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Fallback: serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n✅ Neat n Tidy server running at http://localhost:${PORT}\n`);
    console.log(`📦 Connected to Supabase: ${SUPABASE_URL}`);
    console.log(`💰 Payfast mode: ${PAYFAST_SANDBOX ? 'SANDBOX (testing)' : 'LIVE'}`);
});
