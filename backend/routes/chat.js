const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const auth = require('../auth');

// @route   GET api/chat/:room
// @desc    Get chat history for a specific room
// @access  Public (for now)
router.get('/:room', async (req, res) => {
  try {
    const messages = await Chat.find({ room: req.params.room }).sort({
      timestamp: 1,
    });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/chat
// @desc    Save a new message and broadcast it
// @access  Private
router.post('/', auth, async (req, res) => {
  const { room, sender, message } = req.body;

  if (!room || !sender || !message) {
    return res.status(400).json({ msg: 'Room, sender, dan message dibutuhkan.' });
  }

  try {
    const newMessage = new Chat({ room, sender, message });
    await newMessage.save();

    // Trigger event ke Pusher
    // Channel dibuat private untuk keamanan, misal: 'private-chat-room-xyz'
    const channelName = `private-chat-${room}`;
    req.pusher.trigger(channelName, 'new-message', newMessage);

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Gagal menyimpan pesan chat:', err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/chat/read/:room
// @desc    Mark messages in a room as read
// @access  Public (for now)
router.put('/read/:room', async (req, res) => {
  const { readerId } = req.body;
  if (!readerId) {
    return res.status(400).json({ msg: 'Reader ID is required' });
  }
  try {
    await Chat.updateMany(
      { room: req.params.room, 'sender.id': { $ne: readerId }, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ msg: 'Messages marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/chat/unread/count/:userId
// @desc    Get total unread message count for a user
// @access  Public (for now)
router.get('/unread/count/:userId', async (req, res) => {
  try {
    const unreadCount = await Chat.countDocuments({
      room: { $regex: req.params.userId }, // Find rooms the user is part of
      'sender.id': { $ne: req.params.userId }, // Messages not sent by the user
      isRead: false, // That are unread
    });
    res.json({ count: unreadCount });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;