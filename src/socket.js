import { io } from 'socket.io-client';

let socket;

if (process.env.NODE_ENV === 'production') {
  // Di lingkungan produksi (Vercel), Socket.IO tidak didukung secara native oleh Serverless Functions.
  // Kita akan membuat objek dummy agar kode tidak error, tetapi fungsionalitas real-time tidak akan berjalan.
  console.warn('Socket.IO is disabled in production environment (Vercel Serverless Functions). Real-time features will not work.');
  socket = {
    on: () => {},
    off: () => {},
    emit: () => {},
  };
} else {
  // Untuk development (lokal), kita akan terhubung ke backend lokal.
  const URL = 'http://localhost:5000';
  socket = io(URL); // Biarkan Socket.IO memilih transport terbaik secara default
}

export { socket };