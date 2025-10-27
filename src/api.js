import axios from 'axios';
import { toast } from 'react-toastify';

// Buat instance axios baru
const api = axios.create({
  baseURL: '/api', // Sesuaikan dengan base URL API Anda jika berbeda
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk Request
// Ini akan menambahkan token ke setiap request secara otomatis
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk Response
// Ini adalah bagian terpenting untuk menangani token kedaluwarsa
api.interceptors.response.use(
  (response) => response, // Jika respons sukses, langsung teruskan
  (error) => {
    // Cek jika error adalah 401 Unauthorized
    if (error.response && error.response.status === 401) {
      toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      localStorage.removeItem('token');
      // Redirect ke halaman login dan refresh untuk membersihkan state
      window.location.href = '/login';
    }
    // Untuk error lain, teruskan saja
    return Promise.reject(error);
  }
);

export default api;