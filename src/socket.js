import { io } from 'socket.io-client';

// Untuk production (Vercel), kita tidak perlu menentukan URL.
// Socket.IO akan otomatis terhubung ke host yang sama.
// Untuk development (lokal), kita akan terhubung ke proxy di package.json.
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000';
export const socket = io(URL, {
  // Vercel merekomendasikan untuk secara eksplisit menggunakan websocket
  // karena arsitektur serverless-nya.
  transports: ['websocket'],
});