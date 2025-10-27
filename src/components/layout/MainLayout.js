import React from 'react';
import TopNav from './TopNav';
import BottomNav from './BottomNav';
import { Container } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

/**
 * MainLayout provides a consistent structure for all pages.
 * It includes the top and bottom navigation bars and a main content area.
 */
function MainLayout({ children }) {
  const location = useLocation();
  const getRole = () => {
    if (location.pathname.startsWith('/admin')) return 'admin';
    if (location.pathname.startsWith('/driver')) return 'driver';
    if (location.pathname.startsWith('/parent')) return 'parent';
    return 'default'; // Default role
  };

  const role = getRole();

  return (
    <div className="app-container">
      <TopNav />
      <Container fluid as="main" className="main-content">
        {children}
      </Container>
      <BottomNav role={role} />
    </div>
  );
}

export default MainLayout;