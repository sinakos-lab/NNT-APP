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

// Fallback: serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n✅ Neat n Tidy server running at http://localhost:${PORT}\n`);
    console.log(`📦 Connected to Supabase: ${SUPABASE_URL}`);
});
