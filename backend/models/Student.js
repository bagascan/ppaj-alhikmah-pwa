const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StudentSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  parent: {
    type: Schema.Types.ObjectId, // PERBAIKAN: Harus ObjectId
    ref: 'parent', // Merujuk ke model 'parent'
    required: true,
  },
  school: {
    type: Schema.Types.ObjectId, // Tipe data diubah menjadi ObjectId
    ref: 'School',               // Referensi ke model 'School'
    required: true
  },
  zone: {
    type: String,
    required: true
  },
  // Status umum siswa (aktif/tidak)
  generalStatus: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  // Status siswa dalam satu siklus trip (pagi atau sore)
  tripStatus: {
    type: String,
    enum: ['at_home', 'picked_up', 'at_school', 'dropped_off', 'absent'],
    default: 'at_home'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // Format: [longitude, latitude]
      default: [0, 0]
    }
  },
  // Menentukan layanan yang diikuti siswa
  service: {
    pickup: { type: Boolean, default: true }, // Untuk trip Berangkat ke Sekolah
    dropoff: { type: Boolean, default: true } // Untuk trip Pulang dari Sekolah
  },
  // Jadwal yang diatur oleh wali murid untuk hari berikutnya
  nextDayService: {
    date: { type: Date }, // Tanggal berlakunya jadwal ini
    pickup: { type: Boolean },
    dropoff: { type: Boolean },
    isAbsent: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Menambahkan index untuk query geospasial agar pencarian lokasi lebih cepat
StudentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Student', StudentSchema);