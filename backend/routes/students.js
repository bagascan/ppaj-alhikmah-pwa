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
    // Populate the 'school' field to get school details (name) instead of just the ID
    const students = await Student.find()
      .sort({ createdAt: -1 })
      .populate('school', ['name', 'location'])
      .populate('parent', 'name'); // Ambil juga nama dari profil wali murid
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
      
      // Kirim notifikasi ke supir di zona yang relevan
      // ... (logika notifikasi yang sudah ada) ...
      res.json(student);
    }

    // Kirim notifikasi ke supir di zona yang relevan
    try {
      const driver = await Driver.findOne({ zone: student.zone });
      if (driver) {
        const subscriptions = await Subscription.find({ userId: driver._id });
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
    } catch (notificationError) {
      console.error('Error saat mengirim notifikasi siswa baru:', notificationError);
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
        if (driver) {
          const subscriptions = await Subscription.find({ userId: driver._id });
          const payload = JSON.stringify({
            title: 'Data Siswa Diperbarui',
            body: `Data untuk siswa ${updatedStudent.name} di zona Anda telah diperbarui.`,
            icon: '/logo192.png'
          });
          subscriptions.forEach(sub => {
            webpush.sendNotification(sub.subscription, payload).catch(err => console.error('Gagal mengirim notif update siswa:', err));
          });
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
          const subscriptions = await Subscription.find({ userId: driver._id });
          
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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set waktu ke awal hari

      // Cari supir berdasarkan zona siswa yang diupdate
      const driver = await Driver.findOne({ zone: updatedStudent.zone });

      if (driver) {
        await TripLog.findOneAndUpdate(
          { student: student._id, date: today },
          {
            $set: { driver: driver._id, student: student._id },
            $push: { events: { status: tripStatus, timestamp: new Date() } },
          },
          { upsert: true, new: true } // `upsert: true` akan membuat dokumen baru jika tidak ditemukan
        );
      } else {
        console.warn(`Tidak ada supir ditemukan untuk zona ${updatedStudent.zone} saat mencatat riwayat.`);
      }

      // Kirim notifikasi real-time ke wali murid
      // PERBAIKAN: Dapatkan profil Parent untuk mendapatkan namanya
      const parentProfile = await Parent.findById(updatedStudent.parent);
      const parentId = parentProfile ? parentProfile.name : null;

      if (parentId) {
        // Buat pesan yang lebih deskriptif
        let statusMessage = `Status ananda ${updatedStudent.name} telah diperbarui.`;
        const statusMap = {
          'picked_up': `telah dijemput dari rumah.`,
          'at_school': `telah tiba di sekolah.`,
          'dropped_off': `telah diantar pulang ke rumah.`,
          'absent': `dinyatakan tidak hadir hari ini.`
        };
        if (statusMap[tripStatus]) {
          statusMessage = `Ananda ${updatedStudent.name} ${statusMap[tripStatus]}`;
        }

        const notificationData = {
          studentName: updatedStudent.name,
          status: tripStatus,
          message: statusMessage
        };
        // Menggunakan Pusher
        // Channel dibuat private untuk keamanan, misal: 'private-parent-wali1'
        const channelName = `private-parent-${parentId}`;
        req.pusher.trigger(channelName, 'student-status-update', notificationData);
        console.log(`[Pusher] Triggered 'student-status-update' on channel '${channelName}'`);

        // Kirim Web Push Notification
        try {
          // PERBAIKAN: Cari user berdasarkan profileId (ObjectId) dari siswa yang diupdate
          const subscriptions = await Subscription.find({ userId: updatedStudent.parent });
          const payload = JSON.stringify({ title: 'Update Status Antar-Jemput', body: notificationData.message, icon: '/logo192.png' });

          // PERBAIKAN DEFINITIF: Gunakan Promise.allSettled untuk mengirim notifikasi secara aman.
          // Ini akan mencegah server crash jika salah satu subscription tidak valid.
          const pushPromises = subscriptions.map(sub =>
            webpush.sendNotification(sub.subscription, payload)
              .catch(error => {
                // Jika subscription tidak valid (misal: error 410 Gone), kita bisa menghapusnya dari database.
                if (error.statusCode === 410) {
                  console.log(`Subscription ${sub._id} sudah tidak valid, akan dihapus.`);
                  return Subscription.findByIdAndDelete(sub._id);
                }
                console.error('Gagal mengirim push notification:', error.statusCode, error.body);
                // Return null atau Promise yang resolve agar allSettled tidak menganggapnya sebagai error besar
                return null;
              })
          );
          await Promise.allSettled(pushPromises);
        } catch (pushError) {
          console.error('Error saat mencari langganan untuk push notif:', pushError);
        }
      }
    }

    res.json(updatedStudent);
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

module.exports = router;