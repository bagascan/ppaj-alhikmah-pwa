const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Driver = require('../models/Driver');
const Student = require('../models/Student');
const Subscription = require('../models/Subscription');
const User = require('../models/User'); // PERBAIKAN: Impor model User
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
    const driverProfileIds = targetDrivers.map(d => d._id);

    // 2. Temukan semua user yang memiliki profileId dari supir-supir tersebut
    const targetUsers = await User.find({ profileId: { $in: driverProfileIds }, role: 'driver' });
    const userIds = targetUsers.map(u => u._id);

    // 3. Temukan semua langganan notifikasi dari user-user tersebut
    const subscriptions = await Subscription.find({ userId: { $in: userIds } });

    const payload = JSON.stringify({
      title: 'Pemberitahuan dari Admin',
      body: message,
      icon: '/logo192.png'
    });

    // 4. Kirim notifikasi ke setiap langganan
    const pushPromises = subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription, payload)
        .catch(error => {
          if (error.statusCode === 410) {
            console.log(`Subscription untuk broadcast sudah tidak valid, akan dihapus.`);
            return Subscription.findByIdAndDelete(sub._id);
          }
          console.error('Gagal mengirim broadcast notif:', error.statusCode);
          return null;
        })
    );
    await Promise.allSettled(pushPromises);

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
      const parentProfileId = student.parent;
      if (!parentProfileId) continue;

      // PERBAIKAN: Cari User wali murid berdasarkan profileId
      const parentUser = await User.findOne({ profileId: parentProfileId, role: 'parent' });
      if (!parentUser) continue;

      // PERBAIKAN: Cari subscription berdasarkan _id dari User, bukan profileId
      const subscriptions = await Subscription.find({ userId: parentUser._id });

      const payload = JSON.stringify({
        title: `Info Darurat dari Supir`,
        body: `Untuk ananda ${student.name}: ${message}`,
        icon: '/logo192.png'
      });

      // Kirim notifikasi ke setiap langganan dengan aman menggunakan loop for...of
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (error) {
          console.error('Gagal mengirim notif darurat ke satu subscription:', error.statusCode);
          if (error.statusCode === 410) {
            // Hapus subscription yang tidak valid
            await Subscription.findByIdAndDelete(sub._id);
          }
        }
      }
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

    // PERBAIKAN: Cari semua user dengan peran 'admin'
    const adminUsers = await User.find({ role: 'admin' });
    const adminUserIds = adminUsers.map(u => u._id);

    // PERBAIKAN: Cari semua subscription milik admin
    const subscriptions = await Subscription.find({ userId: { $in: adminUserIds } });

    if (subscriptions.length === 0) {
      return res.status(200).json({ msg: 'Permohonan terkirim, namun tidak ada admin yang terdaftar untuk notifikasi push.' });
    }

    const payload = JSON.stringify({
      title: `Permohonan Ganti Supir (Zona ${driver.zone})`,
      body: `Supir ${driver.name} meminta pergantian. Alasan: "${reason}"`,
      icon: '/logo192.png'
    });

    const pushPromises = subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription, payload)
        .catch(error => {
          if (error.statusCode === 410) {
            console.log(`Subscription admin sudah tidak valid, akan dihapus.`);
            return Subscription.findByIdAndDelete(sub._id);
          }
          console.error('Gagal mengirim notif permohonan ganti:', error.statusCode);
          return null;
        })
    );
    await Promise.allSettled(pushPromises);

    res.json({ msg: 'Permohonan pergantian supir telah berhasil dikirim ke admin.' });
  } catch (err) {
    console.error('Error saat meminta pergantian supir:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;