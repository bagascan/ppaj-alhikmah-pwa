const express = require('express');
const router = express.Router();
const TripLog = require('../models/TripLog');
const Driver = require('../models/Driver'); // Impor model Driver

// @route   GET api/reports/trips
// @desc    Get trip logs based on filters
// @access  Private (Admin)
router.get('/trips', async (req, res) => {
  try {
    const { startDate, endDate, driverId, zone } = req.query;

    const query = {};

    if (startDate && endDate) {
      // PERBAIKAN FINAL: Gunakan JavaScript native untuk membuat tanggal.
      // Ini akan menginterpretasikan tanggal sebagai awal/akhir hari di zona waktu server.
      const localStartDate = new Date(`${startDate}T00:00:00`);
      const localEndDate = new Date(`${endDate}T23:59:59.999`);
      query.date = {
        $gte: localStartDate,
        $lte: localEndDate
      };
    }

    // PERBAIKAN: Logika filter supir dan zona yang lebih baik
    if (zone && zone !== '' && driverId && driverId !== '') {
      // Jika keduanya dipilih, pastikan supir tersebut ada di zona yang dipilih (meski UI harusnya sudah menjamin ini)
      // Ini hanya sebagai pengaman, query utama tetap berdasarkan driverId.
      const driverInZone = await Driver.findOne({ _id: driverId, zone: zone });
      // Jika supir tidak ada di zona itu, jangan kembalikan apa-apa.
      query.driver = driverInZone ? driverId : null;
    } else if (driverId && driverId !== '') {
      // Jika hanya supir yang dipilih
      query.driver = driverId;
    } else if (zone && zone !== '') {
      // Jika hanya zona yang dipilih
      const driversInZone = await Driver.find({ zone: zone }).select('_id');
      const driverIdsInZone = driversInZone.map(d => d._id);
      if (driverIdsInZone.length > 0) {
        query.driver = { $in: driverIdsInZone };
      } else {
        // Jika tidak ada supir di zona itu, buat query yang tidak akan mengembalikan hasil.
        query.driver = null; // Mencari driver dengan ID null (tidak akan ada)
      }
    }

    const logs = await TripLog.find(query)
      .populate('student', 'name')
      .populate('driver', 'name')
      .sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;