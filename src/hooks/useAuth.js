import { useState, useEffect } from 'react';

/**
 * Custom hook untuk mendapatkan data otentikasi pengguna dari token JWT.
 * Mengembalikan objek yang berisi data pengguna, token, dan status loading.
 * @returns {{auth: {user: object, token: string}|null, loading: boolean}}
 */
export function useAuth() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userPayload = JSON.parse(atob(token.split('.')[1]));
        // Pastikan payload memiliki properti 'user'
        if (userPayload && userPayload.user) {
          setAuth({ user: userPayload.user, token });
        }
      }
    } catch (error) {
      console.error("Failed to parse auth token:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { auth, loading };
}