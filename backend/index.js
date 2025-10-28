
const express = require('express');
const mongoose = require('mongoose');
const webpush = require('web-push'); // Impor web-push
const Pusher = require('pusher');
const cors = require('cors');
const https = require('https'); // Tambahkan modul https
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Middleware untuk parsing JSON body
// PERBAIKAN: Tambahkan middleware untuk parsing application/x-www-form-urlencoded
// Ini diperlukan agar endpoint otentikasi Pusher dapat membaca req.body
app.use(express.urlencoded({ extended: true }));
const Student = require('./models/Student'); // Impor model Student

// Inisialisasi Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Middleware untuk melampirkan instance Pusher ke setiap request
app.use((req, res, next) => {
  req.pusher = pusher;
  next();
});

// Konfigurasi VAPID Keys untuk Web Push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:admin@example.com', vapidPublicKey, vapidPrivateKey);
}

// Connect to MongoDB
if (mongoose.connection.readyState !== 1) {
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
}

app.get('/', (req, res) => {
  res.send('PPAJ Al-Hikmah Backend is running!');
});

// Define Routes
app.use('/api/students', require('./routes/students'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/zones', require('./routes/zones'));
app.use('/api/schools', require('./routes/schools'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/auth', require('./routes/auth'));

app.post('/api/route', (req, res) => {
  const { waypoints } = req.body;

  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return res.status(400).json({ message: 'Invalid waypoints data.' });
  }

  // Perbaikan: Pastikan formatnya adalah point=latitude,longitude
  const pointParams = waypoints.map(p => `point=${p[0]},${p[1]}`).join('&');
  const apiKey = process.env.GRAPHHOPPER_API_KEY;

  if (!apiKey) {
    console.error("GRAPHHOPPER_API_KEY not found in .env file.");
    return res.status(500).json({ message: 'Routing service is not configured on the server.' });
  }

  const url = `https://graphhopper.com/api/1/route?${pointParams}&profile=car&calc_points=true&points_encoded=false&key=${apiKey}`;

  const ghRequest = https.get(url, (ghResponse) => {
    let data = '';

    ghResponse.on('data', (chunk) => {
      data += chunk;
    });

    ghResponse.on('end', () => {
      try {
        const parsedData = JSON.parse(data);
        if (ghResponse.statusCode >= 200 && ghResponse.statusCode < 300) {
          res.json(parsedData);
        } else {
          console.error(`GraphHopper API responded with status: ${ghResponse.statusCode}`, parsedData);
          res.status(ghResponse.statusCode).json({ message: 'Failed to retrieve route from GraphHopper.', details: parsedData });
        }
      } catch (e) {
        console.error("Failed to parse JSON from GraphHopper", e);
        res.status(500).json({ message: "Invalid response from routing service." });
      }
    });

  }).on('error', (err) => {
    console.error('Error with GraphHopper request:', err.message);
    res.status(500).json({ message: 'Error connecting to routing service.' });
  });

  ghRequest.end();
});

// Endpoint untuk Cron Job yang akan dipanggil oleh Vercel
app.get('/api/cron/reset-status', async (req, res) => {
  console.log('[CRON] Menjalankan tugas reset status siswa via Vercel Cron.');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const studentsWithNextDaySchedule = await Student.find({ 'nextDayService.date': { $gte: today } });

    for (const student of studentsWithNextDaySchedule) {
      const newService = {
        pickup: student.nextDayService.pickup,
        dropoff: student.nextDayService.dropoff,
      };
      const newTripStatus = student.nextDayService.isAbsent ? 'absent' : 'at_home';
      await Student.updateOne({ _id: student._id }, { $set: { service: newService, tripStatus: newTripStatus } });
    }

    const resetResult = await Student.updateMany({ 'nextDayService.date': { $ne: today } }, { $set: { tripStatus: 'at_home' } });

    res.status(200).json({
      message: 'Cron job executed successfully.',
      appliedSchedules: studentsWithNextDaySchedule.length,
      resetStudents: resetResult.modifiedCount
    });
  } catch (error) {
    console.error('[CRON] Terjadi error saat mereset status siswa:', error);
    res.status(500).json({ message: 'Cron job failed.', error: error.message });
  }
});

// PERBAIKAN: Tambahkan blok ini untuk menjalankan server di lingkungan lokal.
// Vercel akan mengabaikan blok ini dan hanya menggunakan `module.exports`.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[LOCAL DEV] Server backend berjalan di http://localhost:${PORT}`));
}

module.exports = app;
