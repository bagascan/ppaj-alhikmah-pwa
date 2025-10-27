const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'driver', 'parent'],
    required: true,
  },
  // ID yang merujuk ke profil spesifik (misal: ID dari collection Driver, atau nama wali murid)
  profileId: {
    type: String, // Menggunakan String agar fleksibel untuk ObjectId atau nama wali murid
    required: true,
  }
});

module.exports = mongoose.model('User', UserSchema);