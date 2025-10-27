const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriptionSchema = new Schema({
  // ID pengguna yang berlangganan notifikasi (misal: parentId)
  userId: {
    type: String,
    required: true,
  },
  subscription: {
    endpoint: { type: String, required: true },
    expirationTime: { type: Date, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
});

// Indeks untuk memastikan satu perangkat hanya bisa subscribe sekali per pengguna
SubscriptionSchema.index({ userId: 1, 'subscription.endpoint': 1 }, { unique: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);