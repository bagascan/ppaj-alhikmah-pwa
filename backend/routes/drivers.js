const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Driver = require('../models/Driver');
const Student = require('../models/Student');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');
const auth = require('../auth');

// @route   GET api/drivers
// @desc    Get all drivers
router.get('/', auth, async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ name: 1 });
    res.json(drivers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/drivers/for-parent
// @desc    Get relevant drivers for a logged-in parent
// @access  Private (Parent)
router.get('/for-parent', auth, async (req, res) => {
  // Pastikan yang mengakses adalah wali murid
  if (req.user.role !== 'parent') {
    return res.status(403).json({ msg: 'Akses ditolak: Hanya untuk wali murid.' });
  }

  try {
    // 1. Dapatkan nama wali murid dari token
    const parentName = req.user.profileId;

    // 2. Cari semua zona unik dari anak-anak wali murid tersebut
    const students = await Student.find({ parent: parentName }).distinct('zone');
    if (students.length === 0) {
      return res.json([]); // Tidak punya anak terdaftar, kembalikan array kosong
    }

    // 3. Cari semua supir yang bertugas di zona-zona tersebut
    const drivers = await Driver.find({ zone: { $in: students } });
    res.json(drivers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/drivers/:id
// @desc    Get a single driver by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ msg: 'Driver not found' });
    }
    res.json(driver);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/drivers
// @desc    Add a new driver
router.post('/', auth, async (req, res) => {
  const { name, phone, vehicle, zone, location, userData } = req.body;
  try {
    const newDriver = new Driver({ name, phone, vehicle, zone, location });
    const driver = await newDriver.save();

    // Buat akun User untuk supir jika datanya ada
    if (userData) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = new User({
          name: name,
          email: userData.email,
          password: userData.password,
          role: 'driver',
          profileId: driver._id, // profileId adalah ObjectId dari supir
        });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();
      }
    }

    res.json(driver);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/drivers/:id
// @desc    Update a driver
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedDriver = await Driver.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!updatedDriver) return res.status(404).json({ msg: 'Driver not found' });
    res.json(updatedDriver);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/drivers/:id
// @desc    Delete a driver
router.delete('/:id', auth, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ msg: 'Driver not found' });
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Driver removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/drivers/handover
// @desc    Handle student handover and send push notification
router.post('/handover', auth, async (req, res) => {
  const { studentIds, toDriverId } = req.body;

  try {
    const toDriver = await Driver.findById(toDriverId);
    if (!toDriver) return res.status(404).json({ msg: 'Supir pengganti tidak ditemukan.' });

    // 1. Update zona semua siswa yang dipilih
    await Student.updateMany({ _id: { $in: studentIds } }, { $set: { zone: toDriver.zone } });

    // 2. Kirim notifikasi push ke supir pengganti
    const subscriptions = await Subscription.find({ userId: toDriverId });
    const payload = JSON.stringify({
      title: 'Serah Terima Tugas',
      body: `Anda menerima serah terima untuk ${studentIds.length} siswa. Mohon periksa daftar jemputan Anda.`,
      icon: '/logo192.png'
    });

    const pushPromises = subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription, payload)
        .catch(error => {
          if (error.statusCode === 410) {
            console.log(`Subscription untuk handover sudah tidak valid, akan dihapus.`);
            return Subscription.findByIdAndDelete(sub._id);
          }
          console.error('Gagal mengirim notif handover:', error.statusCode);
          return null;
        })
    );
    await Promise.allSettled(pushPromises);

    res.json({ msg: `${studentIds.length} siswa berhasil dipindahkan ke zona ${toDriver.zone}.` });

  } catch (err) {
    console.error('Error saat serah terima:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/drivers/location
// @desc    Receive location update from a driver and broadcast it
// @access  Private (Driver)
router.post('/location', auth, async (req, res) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ msg: 'Akses ditolak.' });
  }

  const { lat, lng } = req.body;
  const driverId = req.user.profileId;

  if (!lat || !lng) {
    return res.status(400).json({ msg: 'Latitude dan Longitude dibutuhkan.' });
  }

  const payload = {
    driverId: driverId,
    location: { lat, lng }
  };

  req.pusher.trigger('tracking-channel', 'location-update', payload);
  res.status(200).json({ msg: 'Location updated' });
});

module.exports = router;