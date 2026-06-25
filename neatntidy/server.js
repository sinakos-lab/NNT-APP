const express = require('express');
const path = require('path');

// Supabase setup
const { createClient } = require('@supabase/supabase-js');

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
});
