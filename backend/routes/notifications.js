const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Driver = require('../models/Driver');
const Student = require('../models/Student');
const Subscription = require('../models/Subscription');
const auth = require('../auth');

// @route   POST api/notifications/broadcast
// @desc    Send a broadcast push notification to drivers
// @access  Private (Admin)
router.post('/broadcast', auth, async (req, res) => {
  const { message, targetZone } = req.body;

  if (!message) {
    return res.status(400).json({ msg: 'Pesan tidak boleh kosong.' });
  }

  try {
    // Tentukan kriteria pencarian supir
    const query = {};
    if (targetZone && targetZone !== 'all') {
      query.zone = targetZone;
    }

    // 1. Temukan semua supir yang sesuai target
    const targetDrivers = await Driver.find(query);
    const driverIds = targetDrivers.map(d => d._id.toString());

    // 2. Temukan semua langganan notifikasi dari supir-supir tersebut
    const subscriptions = await Subscription.find({ userId: { $in: driverIds } });

    const payload = JSON.stringify({
      title: 'Pemberitahuan dari Admin',
      body: message,
      icon: '/logo192.png'
    });

    // 3. Kirim notifikasi ke setiap langganan
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub.subscription, payload).catch(err => console.error('Gagal mengirim broadcast notif:', err));
    });

    res.json({ msg: `Notifikasi berhasil dikirim ke ${subscriptions.length} perangkat.` });
  } catch (err) {
    console.error('Error saat mengirim broadcast:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notifications/emergency
// @desc    Send an emergency push notification from a driver to parents
// @access  Private
router.post('/emergency', auth, async (req, res) => {
  const { driverId, message, tripType } = req.body;

  if (!driverId || !message || !tripType) {
    return res.status(400).json({ msg: 'Driver ID, pesan, dan jenis trip dibutuhkan.' });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ msg: 'Supir tidak ditemukan.' });

    // Tentukan status siswa yang relevan berdasarkan jenis trip
    const relevantStatus = tripType === 'pickup' ? 'picked_up' : 'at_school';

    // 1. Temukan semua siswa yang sedang dalam perjalanan dengan supir ini
    const studentsOnTrip = await Student.find({ 
      zone: driver.zone,
      tripStatus: relevantStatus 
    });

    if (studentsOnTrip.length === 0) {
      return res.status(404).json({ msg: 'Tidak ada siswa yang sedang dalam perjalanan.' });
    }

    // 2. Kirim notifikasi ke setiap wali murid dari siswa tersebut
    for (const student of studentsOnTrip) {
      const parentId = student.parent;
      const subscriptions = await Subscription.find({ userId: parentId });

      const payload = JSON.stringify({
        title: `Info Darurat dari Supir`,
        body: `Untuk ananda ${student.name}: ${message}`,
        icon: '/logo192.png'
      });

      subscriptions.forEach(sub => {
        webpush.sendNotification(sub.subscription, payload).catch(err => console.error('Gagal mengirim notif darurat:', err));
      });
    }

    res.json({ msg: `Notifikasi darurat berhasil dikirim ke ${studentsOnTrip.length} wali murid.` });
  } catch (err) {
    console.error('Error saat mengirim notifikasi darurat:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notifications/request-change
// @desc    Driver requests a substitute and notifies admin
// @access  Private
router.post('/request-change', auth, async (req, res) => {
  const { driverId, reason } = req.body;

  if (!driverId || !reason) {
    return res.status(400).json({ msg: 'Driver ID dan alasan dibutuhkan.' });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ msg: 'Supir tidak ditemukan.' });

    // Asumsi admin memiliki userId 'admin'. Di aplikasi nyata, ini bisa lebih dinamis.
    const adminUserId = 'admin';
    const subscriptions = await Subscription.find({ userId: adminUserId });

    if (subscriptions.length === 0) {
      return res.status(200).json({ msg: 'Permohonan terkirim, namun tidak ada admin yang terdaftar untuk notifikasi push.' });
    }

    const payload = JSON.stringify({
      title: `Permohonan Ganti Supir (Zona ${driver.zone})`,
      body: `Supir ${driver.name} meminta pergantian. Alasan: "${reason}"`,
      icon: '/logo192.png'
    });

    subscriptions.forEach(sub => {
      webpush.sendNotification(sub.subscription, payload).catch(err => console.error('Gagal mengirim notif permohonan ganti:', err));
    });

    res.json({ msg: 'Permohonan pergantian supir telah berhasil dikirim ke admin.' });
  } catch (err) {
    console.error('Error saat meminta pergantian supir:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;