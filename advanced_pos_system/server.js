const express = require('express');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio WhatsApp credentials (replace with your actual credentials)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+YOUR_TWILIO_WHATSAPP_NUMBER';
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

app.use(express.json()); // For parsing JSON bodies

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API to send WhatsApp receipt
app.post('/api/send-whatsapp-receipt', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message in request body.' });
  }
  try {
    const result = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${to}`,
      body: message
    });
    res.json({ success: true, sid: result.sid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send WhatsApp message', details: err.message });
  }
});

// Example API route (expand as needed)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Advanced POS System backend is running.' });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
