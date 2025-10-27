import Pusher from 'pusher-js';

// Inisialisasi Pusher
const pusher = new Pusher(process.env.REACT_APP_PUSHER_KEY, {
  cluster: process.env.REACT_APP_PUSHER_CLUSTER,
  authEndpoint: '/api/auth/pusher', // Endpoint otentikasi yang kita buat di backend
  auth: {
    headers: {
      // Kirim token JWT untuk otentikasi
      'x-auth-token': localStorage.getItem('token')
    }
  }
});

export default pusher;