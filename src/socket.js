import { io } from 'socket.io-client';

// Gunakan URL dari environment variable jika ada, jika tidak, gunakan localhost
const URL = process.env.REACT_APP_API_URL || 'https://ppaj-alhikmah.vercel.app:5000';

export const socket = io(URL);