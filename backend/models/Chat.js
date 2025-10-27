const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
  // ID unik untuk ruang obrolan, misal: 'driverId-parentName'
  room: {
    type: String,
    required: true,
    index: true, // Index untuk mempercepat pencarian
  },
  sender: {
    // ID pengirim, bisa ID supir atau nama wali murid
    id: { type: String, required: true },
    // Peran pengirim, 'driver' atau 'parent'
    role: { type: String, required: true },
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Chat', ChatSchema);