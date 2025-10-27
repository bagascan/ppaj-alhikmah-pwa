const express = require('express');
const router = express.Router();
const TripLog = require('../models/TripLog');

// @route   GET api/reports/trips
// @desc    Get trip logs based on filters
// @access  Private (Admin)
router.get('/trips', async (req, res) => {
  try {
    const { startDate, endDate, driverId, zone } = req.query;

    const query = {};

    if (startDate && endDate) {
      // Perbaikan: Buat objek Date dengan mempertimbangkan zona waktu server untuk menghindari masalah UTC.
      // Ini memastikan '2024-06-10' diinterpretasikan sebagai awal hari di zona waktu lokal, bukan UTC.
      const localStartDate = new Date(startDate + 'T00:00:00');
      const localEndDate = new Date(endDate + 'T23:59:59.999');
      query.date = {
        $gte: localStartDate,
        $lte: localEndDate
      };
    }

    if (driverId) {
      query.driver = driverId;
    }

    // Note: Filtering by zone requires a more complex query if zone is not in TripLog model.
    // This example assumes we filter by driver, which is more direct.
    // If you need to filter by zone, you would need to join with the Driver or Student collection.

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