const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const Student = require('../models/Student');
const User = require('../models/User'); // Impor model User
const Driver = require('../models/Driver');
const Parent = require('../models/Parent'); // Impor model Parent baru
const TripLog = require('../models/TripLog');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');
const auth = require('../auth'); // 1. Impor middleware auth

// @route   GET api/students
// @desc    Get all students
// @access  Private
router.get('/', auth, async (req, res) => { // 2. Tambahkan 'auth' sebagai middleware
  try {
    // Populate 'school' dan 'parent' untuk mendapatkan detail, bukan hanya ID.
    const students = await Student.find()
      .sort({ createdAt: -1 })
      .populate('school', ['name', 'location'])
      .populate('parent', ['_id', 'name']); // Ambil _id dan nama dari profil wali murid

    res.json(students);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/students/for-parent-tracking
// @desc    Get students and relevant drivers for a logged-in parent
// @access  Private (Parent)
router.get('/for-parent-tracking', auth, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ msg: 'Akses ditolak: Hanya untuk wali murid.' });
  }

  try {
    // PERBAIKAN: Gunakan profileId (ObjectId) dari token untuk mencari siswa.
    const parentProfileId = req.user.profileId;

    // 1. Cari profil Parent untuk mendapatkan namanya (jika diperlukan untuk logika lain)
    const parentProfile = await Parent.findById(parentProfileId);
    if (!parentProfile) return res.status(404).json({ msg: "Profil wali murid tidak ditemukan." });

    // 2. Cari semua siswa yang field 'parent'-nya merujuk ke ObjectId profil ini
    const myStudents = await Student.find({ parent: parentProfile._id }).populate('school');
    if (myStudents.length === 0) {
      return res.status(404).json({ msg: "Siswa tidak ditemukan." });
    }

    // 2. Dapatkan semua zona unik dari siswa-siswa tersebut
    const uniqueZones = [...new Set(myStudents.map(s => s.zone))];

    // 3. Cari semua supir yang bertugas di zona-zona tersebut
    const relevantDrivers = await Driver.find({ zone: { $in: uniqueZones } });

    res.json({ myStudents, relevantDrivers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/students/my-students
// @desc    Get all students for a logged-in parent
// @access  Private (Parent)
router.get('/my-students', auth, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ msg: 'Akses ditolak: Hanya untuk wali murid.' });
  }

  try {
    // PERBAIKAN: Gunakan profileId (ObjectId) dari token untuk mencari siswa.
    const parentProfileId = req.user.profileId;
    const myStudents = await Student.find({ parent: parentProfileId }).sort({ name: 1 });
    res.json(myStudents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/students/:id
// @desc    Get a single student by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
      const student = await Student.findById(req.params.id).populate('school', ['name', 'location']);
      if (!student) {
        return res.status(404).json({ msg: 'Student not found' });
      }
      res.json(student);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Student not found' });
      }
      res.status(500).send('Server Error');
    }
  });


// @route   POST api/students
// @desc    Add a new student
// @access  Private
router.post('/', auth, async (req, res) => {
  const { name, address, parent, school, zone, generalStatus, location, service, parentUserData } = req.body;

  try {
    const newStudent = new Student({
      name,
      address,
      // parent akan diisi di bawah setelah profil Parent dibuat/ditemukan
      school, // This is now an ObjectId
      zone,
      generalStatus,
      location, // This is now a GeoJSON object
      service, // Menambahkan service
    });

    // Buat akun User untuk wali murid jika datanya ada
    if (parentUserData && parent) {
      // PERBAIKAN: Gunakan findOneAndUpdate dengan upsert untuk membuat profil Parent secara atomik.
      // Ini akan membuat profil baru jika belum ada, atau mengembalikan yang sudah ada.
      const parentProfile = await Parent.findOneAndUpdate(
        { name: parent },
        { $setOnInsert: { name: parent } },
        { upsert: true, new: true }
      );

      // PERBAIKAN: Set field 'parent' di siswa dengan ObjectId dari profil Parent
      newStudent.parent = parentProfile._id;

      // Simpan siswa sekarang setelah semua data lengkap
      const student = await newStudent.save();

      let parentUser = await User.findOne({ email: parentUserData.email });
      if (!parentUser) {
        parentUser = new User({
          name: parentUserData.name,
          email: parentUserData.email,
          password: parentUserData.password,
          role: 'parent',
          profileId: parentProfile._id, // PERBAIKAN: profileId sekarang adalah ObjectId dari profil Parent
        });
        const salt = await bcrypt.genSalt(10);
        parentUser.password = await bcrypt.hash(parentUser.password, salt);
        await parentUser.save();
      } else {
        if (parentUser.role !== 'parent') {
          return res.status(400).json({ msg: `Email ${parentUserData.email} sudah terdaftar untuk peran lain.` });
        }
      }
      
      // PERBAIKAN: Pindahkan logika notifikasi ke dalam blok ini agar `student` terjamin ada.
      try {
        const driver = await Driver.findOne({ zone: student.zone });
        if (driver) {
          // PERBAIKAN: Cari User supir berdasarkan profileId
          const driverUser = await User.findOne({ profileId: driver._id });
          // PERBAIKAN: Gunakan _id dari User untuk mencari subscription
          if (driverUser) {
            const subscriptions = await Subscription.find({ userId: driverUser._id });
            const payload = JSON.stringify({
              title: 'Siswa Baru Ditambahkan',
              body: `Siswa baru, ${student.name}, telah ditambahkan ke zona Anda.`,
              icon: '/logo192.png'
            });
    
            subscriptions.forEach(sub => {
              webpush.sendNotification(sub.subscription, payload)
                .catch(err => console.error('Gagal mengirim notif tambah siswa:', err));
            });
          }
        }
      } catch (notificationError) {
        console.error('Error saat mengirim notifikasi siswa baru:', notificationError);
      }

      res.json(student);
    } else {
      // Jika tidak ada parentUserData, simpan saja data siswa dan kirim respons
      const student = await newStudent.save();
      res.json(student);
    }
  } catch (err) {
    console.error("Error di POST /api/students:", err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/students/:id
// @desc    Update a student
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { name, address, parent, school, zone, generalStatus, tripStatus, location, service, nextDayService } = req.body;

  // Build student object
  const studentFields = {};
  if (name) studentFields.name = name;
  if (address) studentFields.address = address;
  if (parent) studentFields.parent = parent;
  if (school) studentFields.school = school; // ObjectId
  if (zone) studentFields.zone = zone;
  if (generalStatus) studentFields.generalStatus = generalStatus;
  if (location) studentFields.location = location; // GeoJSON object
  if (tripStatus) studentFields.tripStatus = tripStatus;
  if (service) studentFields.service = service; // Menambahkan service
  if (nextDayService) studentFields.nextDayService = nextDayService; // Perbaikan: Menambahkan nextDayService

  try {
    let student = await Student.findById(req.params.id);

    if (!student) return res.status(404).json({ msg: 'Student not found' });

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: studentFields },
      { new: true }
    );

    // Kirim notifikasi ke supir jika ada perubahan data (selain status trip)
    // Kita tidak mengirim notif di sini untuk perubahan status trip karena sudah ditangani di blok berikutnya
    if (!tripStatus) {
      try {
        const driver = await Driver.findOne({ zone: updatedStudent.zone });
        if (driver) { // PERBAIKAN: Logika notifikasi yang benar
          // PERBAIKAN: Cari User supir berdasarkan profileId
          const driverUser = await User.findOne({ profileId: driver._id });
          // PERBAIKAN: Gunakan _id dari User untuk mencari subscription
          if (driverUser) {
            const subscriptions = await Subscription.find({ userId: driverUser._id });
            const payload = JSON.stringify({
              title: 'Data Siswa Diperbarui',
              body: `Data untuk siswa ${updatedStudent.name} di zona Anda telah diperbarui.`,
              icon: '/logo192.png'
            });
            subscriptions.forEach(sub => {
              webpush.sendNotification(sub.subscription, payload).catch(err => console.error('Gagal mengirim notif update siswa:', err));
            });
          }
        }
      } catch (notificationError) {
        console.error('Error saat mengirim notifikasi update siswa:', notificationError);
      }
    }

    // Kirim notifikasi ke supir jika wali murid mengubah jadwal untuk hari berikutnya
    if (nextDayService) {
      try {
        const driver = await Driver.findOne({ zone: updatedStudent.zone });
        if (driver) {
          // PERBAIKAN: Cari User supir berdasarkan profileId
          const driverUser = await User.findOne({ profileId: driver._id });
          if (!driverUser) return; // Jika user tidak ditemukan, hentikan

          // PERBAIKAN: Gunakan _id dari User untuk mencari subscription
          const subscriptions = await Subscription.find({ userId: driverUser._id });
          // Buat pesan yang deskriptif berdasarkan data jadwal
          let scheduleStatusText = '';
          if (nextDayService.isAbsent) {
            scheduleStatusText = 'Absen';
          } else if (nextDayService.pickup && nextDayService.dropoff) {
            scheduleStatusText = 'Hadir (Jemput & Antar)';
          } else if (nextDayService.pickup) {
            scheduleStatusText = 'Hanya Jemput';
          } else if (nextDayService.dropoff) {
            scheduleStatusText = 'Hanya Antar';
          }

          const payload = JSON.stringify({
            title: 'Update Jadwal Siswa',
            body: `Jadwal untuk ${updatedStudent.name} besok diubah menjadi: ${scheduleStatusText}.`,
            icon: '/logo192.png'
          });

          subscriptions.forEach(sub => {
            webpush.sendNotification(sub.subscription, payload).catch(err => console.error('Gagal mengirim notif update jadwal:', err));
          });
        }
      } catch (notificationError) {
        console.error('Error saat mengirim notifikasi update jadwal:', notificationError);
      }
    }

    // Jika yang diupdate adalah tripStatus, buat atau perbarui TripLog
    if (tripStatus) {
      // Panggil fungsi helper tanpa 'await' untuk menjalankannya di background
      // PERBAIKAN FINAL: Panggil helper tanpa argumen tanggal.
      // Fungsi helper akan membuat tanggalnya sendiri secara mandiri.
      handlePostTripUpdate(updatedStudent._id, tripStatus);
    }

    res.json(updatedStudent);
  // PERBAIKAN: Tambahkan kurung kurawal penutup untuk blok 'try' utama.
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/students/:id
// @desc    Delete a student
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) return res.status(404).json({ msg: 'Student not found' });

    await Student.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Student removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// =================================================================
// == HELPER FUNCTIONS
// =================================================================

// PERBAIKAN DEFINITIF: Fungsi sekarang menerima objek Date yang sudah jadi.
async function handlePostTripUpdate(studentId, tripStatus) {
  try {
    console.log(`\n[DEBUG] 1. Memulai handlePostTripUpdate untuk studentId: ${studentId} dengan status: ${tripStatus}`);

    // PERBAIKAN DEFINITIF: Hapus date-fns-tz dan gunakan kode native JavaScript.
    // Ini akan membuat fungsi ini mandiri dan tidak bergantung pada scope luar.
    const now = new Date();
    const year = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric' });
    const month = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', month: '2-digit' });
    const day = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', day: '2-digit' });
    const startOfTodayJakartaUTC = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

     console.log('[DEBUG] 2. Mencari data siswa...');
    const student = await Student.findById(studentId).populate('parent', '_id name');
    if (!student) {
      console.error(`[DEBUG] GAGAL: Tidak dapat menemukan siswa dengan ID: ${studentId}. Proses dihentikan.`);
      return;
    }
    console.log(`[DEBUG] 2a. Siswa ditemukan: ${student.name}`);

    console.log('[DEBUG] 3. Menerima data tanggal yang sudah diproses.');

    console.log(`[DEBUG] 3a. Tanggal (UTC) untuk query: ${startOfTodayJakartaUTC.toISOString()}`);

    console.log(`[DEBUG] 4. Mencari supir untuk zona: ${student.zone}...`);
    const driver = await Driver.findOne({ zone: student.zone });
    if (!driver) {
      console.warn(`[TripLog] Tidak ada supir ditemukan untuk zona ${student.zone}.`);
    }else {
      console.log(`[DEBUG] 4a. Supir ditemukan: ${driver.name}`);
    }

    const tripLogQuery = { student: student._id, date: startOfTodayJakartaUTC };
    const tripLogUpdate = {
      $setOnInsert: { driver: driver ? driver._id : null, student: student._id, date: startOfTodayJakartaUTC },
      $push: { events: { status: tripStatus, timestamp: new Date() } },
    };

    console.log('[DEBUG] 5. Akan menjalankan TripLog.findOneAndUpdate dengan data:');
    console.log('   - Query:', JSON.stringify(tripLogQuery, null, 2));
    console.log('   - Update:', JSON.stringify(tripLogUpdate, null, 2));

    await TripLog.findOneAndUpdate(
      tripLogQuery,
      tripLogUpdate,
      { upsert: true, new: true }
    );

    // 2. Mengirim Notifikasi Push ke Wali Murid
     console.log('[DEBUG] 6. SUKSES menyimpan data ke TripLog.');

    console.log('[DEBUG] 7. Memulai proses notifikasi...');
    const parentProfileId = student.parent?._id;
    if (parentProfileId) {
      console.log(`[DEBUG] 7a. Ditemukan parentProfileId: ${parentProfileId}`);
      const statusMap = {
        'picked_up': `telah dijemput dari rumah.`,
        'at_school': `telah tiba di sekolah.`,
        'dropped_off': `telah diantar pulang ke rumah.`,
        'absent': `dinyatakan tidak hadir hari ini.`,
      };
      const statusText = statusMap[tripStatus] || `statusnya telah diperbarui menjadi ${tripStatus}`;
      const message = `Ananda ${student.name} ${statusText}`;
       console.log(`[DEBUG] 7b. Mengirim notifikasi dengan pesan: "${message}"`);
      sendPushNotificationToParent(parentProfileId, message);
    } else {
      console.log('[DEBUG] 7a. Tidak ditemukan parentProfileId, notifikasi dilewati.');
    }
    console.log('[DEBUG] 8. Proses handlePostTripUpdate selesai tanpa error.');
  } catch (error) {
    console.error('Error pada proses post-trip-update:', error);
    console.error('\n[DEBUG] GAGAL TOTAL PADA PROSES post-trip-update:', error);
  }
}

// Fungsi helper untuk mengirim notifikasi secara asinkron (fire and forget)
async function sendPushNotificationToParent(parentProfileId, message) {
  try {
    const parentUser = await User.findOne({ profileId: parentProfileId });
    if (!parentUser) {
      console.warn(`[Notifikasi] User untuk profil wali ${parentProfileId} tidak ditemukan. Notifikasi dilewati.`);
      return;
    }

    const subscriptions = await Subscription.find({ userId: parentUser._id });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title: 'Update Status Antar-Jemput', body: message, icon: '/logo192.png' });

    const pushPromises = subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription, payload).catch(error => {
        if (error.statusCode === 410) {
          console.log(`Subscription ${sub._id} sudah tidak valid, akan dihapus.`);
          return Subscription.findByIdAndDelete(sub._id);
        }
        console.error('Gagal mengirim push notification:', error.body);
      })
    );

    await Promise.allSettled(pushPromises);
  } catch (error) {
    console.error('Error dalam proses pengiriman notifikasi push:', error);
  }
}

module.exports = router;