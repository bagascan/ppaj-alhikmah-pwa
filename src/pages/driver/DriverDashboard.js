import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api';
import { socket } from '../../socket';
import { subscribeUser } from '../../utils/push-notifications';
import DriverHome from './DriverHome'; // DriverHome sekarang akan mengelola logikanya sendiri
import PickupPage from './PickupPage'; // Pastikan ini diimpor
import DriverNav from './DriverNav'; // Pastikan ini diimpor
import DropoffPage from './DropoffPage'; // Impor halaman baru
import DriverProfile from './DriverProfile';
import ChatListPage from './ChatListPage';
import DriverChatPage from './ChatPage';
import ChangePasswordPage from './ChangePasswordPage';

function DriverDashboard() {
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [driverId, setDriverId] = useState(null);
  const [loading, setLoading] = useState(true);
  const watchIdRef = useRef(null);

  // Mengambil ID supir sekali saat komponen dimuat
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Jika tidak ada token, jangan lakukan apa-apa. Biarkan ProtectedRoute bekerja.
      setLoading(false);
      return;
    }

    const user = JSON.parse(atob(token.split('.')[1])).user;

    // Pastikan role adalah supir dan ada profileId
    if (user && user.role === 'driver' && user.profileId) {
      const currentDriverId = user.profileId;
      setDriverId(currentDriverId);

      // Daftarkan supir untuk notifikasi push
      subscribeUser(currentDriverId);
      setLoading(false);
    } else {
      // Jika token ada tapi tidak valid untuk supir, tampilkan error.
      setLocationError("Gagal memverifikasi data supir dari sesi login.");
      toast.error("Sesi login tidak valid untuk supir.");
      setLoading(false);
    }

    const fetchDriverData = async () => {
      // Di masa depan, jika Anda perlu mengambil data tambahan tentang supir,
      // Anda bisa melakukannya di sini menggunakan `user.profileId`.
      try {
        // Contoh: const res = await api.get(`/drivers/${user.profileId}`);
      } catch (error) {
        console.error("Gagal mengambil detail supir", error);
      }
    };

    // Fungsi cleanup ini hanya akan berjalan jika DriverDashboard di-unmount (misal: logout)
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Fungsi untuk menangani error geolokasi dengan lebih baik
  const handleLocationError = (error) => {
    let errorMsg = `ERROR(${error.code}): ${error.message}`;
    let userFriendlyError = 'Tidak bisa mendapatkan lokasi.';

    if (error.code === 1) { // PERMISSION_DENIED
      userFriendlyError = 'Akses lokasi ditolak. Mohon izinkan akses lokasi di pengaturan browser/ponsel Anda.';
    } else if (error.code === 3) { // TIMEOUT
      userFriendlyError = 'Waktu pencarian lokasi habis. Coba lagi di area dengan sinyal GPS yang lebih baik (misal: di luar ruangan).';
    }
    setLocationError(userFriendlyError);
    toast.error(userFriendlyError);
    console.error(errorMsg, error);
  };

  const handleToggleTracking = () => {
    if (!driverId) {
      toast.error("ID Supir tidak ditemukan, tidak bisa memulai pelacakan.");
      return;
    }
    if (!isTracking) {
      if (!navigator.geolocation) {
        setLocationError('Geolocation tidak didukung oleh browser Anda.');
        toast.error('Geolocation tidak didukung.');
        return;
      }

      // Langkah 1: Coba dapatkan lokasi awal dengan timeout lebih panjang
      toast.info('Mencari sinyal lokasi...');
      navigator.geolocation.getCurrentPosition(
          (initialPosition) => {
              toast.success('Sinyal lokasi ditemukan! Pelacakan diaktifkan.');
              const { latitude, longitude } = initialPosition.coords;
              const locationData = {
                  driverId: driverId,
                  location: { lat: latitude, lng: longitude },
              };
              socket.emit('updateLocation', locationData);
              setLocationError(null);

              // Langkah 2: Setelah lokasi awal didapat, mulai watchPosition untuk update real-time
              watchIdRef.current = navigator.geolocation.watchPosition(
                  (position) => {
                      const { latitude, longitude } = position.coords;
                      const locationData = {
                          driverId: driverId,
                          location: { lat: latitude, lng: longitude },
                      };
                      socket.emit('updateLocation', locationData);
                      setLocationError(null); // Hapus error jika berhasil
                  },
                  handleLocationError, // Gunakan handler error yang sudah dibuat
                  { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Timeout untuk watch
              );
          },
          handleLocationError, // Gunakan handler error yang sama untuk getCurrentPosition
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 } // Timeout 20 detik untuk lokasi awal
      );

    } else {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      toast.info('Pelacakan lokasi dinonaktifkan.');
    }
    setIsTracking(!isTracking);
  };

  return (
    <Container>
      <Routes>
        <Route path="/" element={<DriverHome loading={loading} isTracking={isTracking} locationError={locationError} handleToggleTracking={handleToggleTracking} driverId={driverId} />} />
        <Route path="pickup" element={<PickupPage />} />
        <Route path="dropoff" element={<DropoffPage />} />
        {/* Untuk DriverNav, kita akan mengambil lokasi dari DriverHome jika diperlukan nanti,
            untuk sekarang kita biarkan sederhana */}
        <Route path="nav" element={<DriverNav />} />
        <Route path="profile/change-password" element={<ChangePasswordPage />} />
        <Route path="profile" element={<DriverProfile />} />
        <Route path="chat" element={<ChatListPage />} />
        <Route path="chat/:parentId" element={<DriverChatPage />} />
        <Route path="*" element={<Navigate to="/driver" replace />} />
      </Routes>
    </Container>
  );
}

export default DriverDashboard;