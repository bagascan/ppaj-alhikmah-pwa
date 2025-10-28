import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import Global Styles
import './App.css';
import './styles/main.css';

// Import Layout
import MainLayout from './components/layout/MainLayout';

// Import Pages
import Home from './pages/Home';
import AdminDashboard from './pages/admin/AdminDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import ParentDashboard from './pages/parent/ParentDashboard';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
      <MainLayout>
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route 
            path="/admin/*" 
            element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/driver/*" 
            element={<ProtectedRoute allowedRoles={['driver']}><DriverDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/parent/*" 
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <ParentDashboard />
              </ProtectedRoute>} 
          />
        </Routes>
      </MainLayout>
  );
}

export default App;
