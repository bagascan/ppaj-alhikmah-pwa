import { io } from 'socket.io-client';

// Gunakan URL dari environment variable jika ada, jika tidak, gunakan localhost
const URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const socket = io(URL);