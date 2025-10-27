
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cron = require('node-cron'); // Impor node-cron
const webpush = require('web-push'); // Impor web-push
const Chat = require('./models/Chat'); // Impor model Chat
const { Server } = require('socket.io');
const cors = require('cors');
const https = require('https'); // Tambahkan modul https
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Middleware untuk parsing JSON body
const server = http.createServer(app);
const Student = require('./models/Student'); // Impor model Student

// Konfigurasi VAPID Keys untuk Web Push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:admin@example.com', vapidPublicKey, vapidPrivateKey);
}

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from the React app
    methods: ["GET", "POST"]
  }
});

// Middleware untuk melampirkan instance 'io' ke setiap request
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });

  // Example: Listen for location updates from a driver
  socket.on('updateLocation', (data) => {
    // Broadcast the location to all connected parents
    console.log('[DEBUG] Server: Menerima "updateLocation" dari supir:', data);
    io.emit('locationUpdated', data);
    console.log('[DEBUG] Server: Menyiarkan "locationUpdated" ke semua klien.');
  });

  // Bergabung ke ruang obrolan
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  // Menerima dan menyimpan pesan baru
  socket.on('sendMessage', async (data, callback) => {
    const { room, sender, message } = data;
    const newMessage = new Chat({ room, sender, message });

    try {
      await newMessage.save();
      // Siarkan pesan baru ke semua orang di ruang obrolan yang sama
      io.to(room).emit('receiveMessage', newMessage);
      callback({ status: 'ok' }); // Kirim konfirmasi kembali ke pengirim
    } catch (error) {
      console.error('Gagal menyimpan pesan chat:', error);
      callback({ status: 'error' });
    }
  });
});


// --- TUGAS TERJADWAL UNTUK MERESET STATUS SISWA ---
// Jadwal ini akan berjalan setiap hari pada pukul 03:00 pagi (Waktu Indonesia Barat).
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] Menjalankan tugas reset status siswa pada pukul 03:00 WIB.');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // 1. Cari semua siswa yang punya jadwal untuk hari ini
    const studentsWithNextDaySchedule = await Student.find({ 
      'nextDayService.date': { $gte: today } 
    });

    // 2. Terapkan jadwal tersebut ke field 'service' dan 'tripStatus'
    for (const student of studentsWithNextDaySchedule) {
      const newService = {
        pickup: student.nextDayService.pickup,
        dropoff: student.nextDayService.dropoff,
      };
      const newTripStatus = student.nextDayService.isAbsent ? 'absent' : 'at_home';
      await Student.updateOne({ _id: student._id }, { $set: { service: newService, tripStatus: newTripStatus } });
    }
    console.log(`[CRON] ${studentsWithNextDaySchedule.length} jadwal harian telah diterapkan.`);

    // 3. Reset status siswa lain yang tidak punya jadwal khusus
    const resetResult = await Student.updateMany({ 'nextDayService.date': { $ne: today } }, { $set: { tripStatus: 'at_home' } });
    console.log(`[CRON] ${resetResult.modifiedCount} status siswa lainnya telah di-reset.`);

  } catch (error) {
    console.error('[CRON] Terjadi error saat mereset status siswa:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Jakarta"
});

console.log('[CRON] Tugas harian untuk reset status siswa telah dijadwalkan pada pukul 03:00 WIB.');

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
