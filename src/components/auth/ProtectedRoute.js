import React from 'react';
import { Navigate } from 'react-router-dom';

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // Jika tidak ada token, redirect ke halaman login
    return <Navigate to="/login" replace />;
  }

  const decodedToken = decodeToken(token);
  const userRole = decodedToken?.user?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Jika token tidak valid atau peran tidak diizinkan, redirect ke halaman utama
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;