const express = require('express');
const router = express.Router();
const auth = require('../auth');
const TripLog = require('../models/TripLog');
const Student = require('../models/Student'); // Impor model Student
const Parent = require('../models/Parent'); // PERBAIKAN: Impor model Parent

// @route   GET api/trips/history/driver/:driverId
// @desc    Get trip history for a specific driver
// @access  Public (for now)
router.get('/history/driver/:driverId', async (req, res) => {
  try {
    const history = await TripLog.find({ driver: req.params.driverId })
      .populate('student', 'name') // Ambil nama siswa
      .sort({ date: -1 })
      .limit(50); // Batasi untuk performa

    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/trips/history/parent/:parentName
// @desc    Get trip history for a specific parent
// @access  Private (Parent)
router.get('/history/parent', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ msg: 'Akses ditolak.' });
    }

    // PERBAIKAN: Gunakan profileId (ObjectId) dari token untuk mencari Parent, lalu gunakan namanya.
    const parentProfile = await Parent.findById(req.user.profileId);
    if (!parentProfile) return res.status(404).json({ msg: 'Profil wali murid tidak ditemukan.' });
    // 1. Cari semua siswa yang dimiliki oleh wali murid ini
    // PERBAIKAN KRITIS: Field 'parent' di model Student adalah ObjectId, bukan nama.
    const students = await Student.find({ parent: parentProfile._id });
    if (!students || students.length === 0) {
      return res.json([]); // Kembalikan array kosong jika tidak ada siswa
    }

    // 2. Dapatkan semua ID siswa
    const studentIds = students.map(s => s._id);

    // 3. Cari semua log perjalanan untuk siswa-siswa tersebut
    const history = await TripLog.find({ student: { $in: studentIds } })
      .populate('student', 'name')
      .populate('driver', 'name') // Ambil juga nama supir
      .sort({ date: -1 })
      .limit(50);

    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;