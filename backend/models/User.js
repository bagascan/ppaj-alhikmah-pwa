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
    type: Schema.Types.ObjectId, // PERBAIKAN: Harus selalu ObjectId
    required: true,
    refPath: 'role' // Merujuk ke model 'driver' atau 'parent' berdasarkan nilai field 'role'
  }
});

module.exports = mongoose.model('User', UserSchema);