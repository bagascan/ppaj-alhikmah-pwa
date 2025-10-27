const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');

// @route   POST api/subscribe
// @desc    Save a push notification subscription
// @access  Public
router.post('/', async (req, res) => {
  const { userId, subscription } = req.body;

  try {
    // Gunakan upsert untuk membuat langganan baru atau memperbarui yang sudah ada
    await Subscription.findOneAndUpdate(
      { userId: userId, 'subscription.endpoint': subscription.endpoint },
      { userId: userId, subscription: subscription },
      { upsert: true }
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Gagal menyimpan langganan:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;