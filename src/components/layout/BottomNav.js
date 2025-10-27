import React, { useState, useEffect } from 'react';
import { Nav, Badge } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';
import { BsHouse, BsListTask, BsPerson, BsMap, BsSignpostSplit, BsGeoAlt, BsChatDots, BsPersonPlusFill, BsPersonCircle, BsBuilding, BsClockHistory, BsFileEarmarkText, BsBoxArrowRight, BsCalendar2Check } from 'react-icons/bs';
import api from '../../api';

function BottomNav({ role }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let intervalId;

    const fetchUnreadCount = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const user = JSON.parse(atob(token.split('.')[1])).user;
      const userId = user.profileId;

      if (!userId) return;
      try {
        const res = await api.get(`/chat/unread/count/${userId}`);
        setUnreadCount(res.data.count);
      } catch (error) {
        console.error("Gagal mengambil jumlah pesan belum dibaca:", error);
      }
    };

    if (role === 'driver' || role === 'parent') {
      fetchUnreadCount();
      intervalId = setInterval(fetchUnreadCount, 30000); // Cek pesan baru setiap 30 detik
    }

    // Listener untuk event kustom saat pesan dibaca
    const handleMessagesRead = () => fetchUnreadCount();
    window.addEventListener('messagesRead', handleMessagesRead);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('messagesRead', handleMessagesRead);
    };
  }, [role]);

  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { path: '/admin', icon: <BsHouse />, label: 'Home' },
          { path: '/admin/students', icon: <BsPerson />, label: 'Siswa' },
          { path: '/admin/schools', icon: <BsBuilding />, label: 'Sekolah' },
          { path: '/admin/drivers', icon: <BsPersonPlusFill />, label: 'Supir' },
          { path: '/admin/zones', icon: <BsGeoAlt />, label: 'Zona' },
          { path: '/admin/monitor', icon: <BsMap />, label: 'Monitor' },
          { path: '/admin/reports', icon: <BsFileEarmarkText />, label: 'Laporan' },
        ];
      case 'driver':
        return [
          { path: '/driver', icon: <BsHouse />, label: 'Home' },
          { path: '/driver/pickup', icon: <BsListTask />, label: 'Jemput' },
          { path: '/driver/dropoff', icon: <BsBoxArrowRight />, label: 'Antar' },
          { path: '/driver/nav', icon: <BsSignpostSplit />, label: 'Navigasi' },
          { 
            path: '/driver/chat', 
            icon: <div className="position-relative">{unreadCount > 0 && <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6em' }}>{unreadCount}</Badge>}<BsChatDots /></div>, 
            label: 'Chat' 
          },
          { path: '/driver/profile', icon: <BsPersonCircle />, label: 'Profil' },
        ];
      case 'parent':
        return [
          { path: '/parent', icon: <BsHouse />, label: 'Home' },
          { path: '/parent/track', icon: <BsMap />, label: 'Lacak' },
          { path: '/parent/schedule', icon: <BsCalendar2Check />, label: 'Jadwal' },
          { path: '/parent/history', icon: <BsClockHistory />, label: 'Riwayat' },
          { 
            path: '/parent/chat', 
            icon: <div className="position-relative">{unreadCount > 0 && <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6em' }}>{unreadCount}</Badge>}<BsChatDots /></div>, 
            label: 'Chat' 
          },
        ];
      default:
       return [{ path: '/', icon: <BsHouse />, label: 'Home' }];
    }
  };

  return (
    <nav className="fixed-bottom bottom-nav">
      <Nav className="w-100 justify-content-around">
        {getNavLinks().map((link, index) => (
          <NavLink key={index} to={link.path} className="nav-link">
            <div className="icon">{link.icon}</div>
            <span style={{ fontSize: '0.7rem' }}>{link.label}</span>
          </NavLink>
        ))}
      </Nav>
    </nav>
  );
}

export default BottomNav;