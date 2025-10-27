import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import ParentHome from './ParentHome';
import TrackPage from './TrackPage';
import SchedulePage from './SchedulePage';
import HistoryPage from './HistoryPage';
import ParentChatListPage from './ChatListPage'; // Impor halaman baru
import ChatPage from './ChatPage';

function ParentDashboard() {
  return (
    <Container>
      <Routes>
        <Route path="/" element={<ParentHome />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="history" element={<HistoryPage />} />
        {/* Gunakan ParentChatListPage */}
        <Route path="chat" element={<ParentChatListPage />} /> 
        {/* Route untuk chat individual tetap sama */}
        <Route path="chat/:driverId" element={<ChatPage />} /> 
        <Route path="*" element={<Navigate to="/parent" replace />} />
      </Routes>
    </Container>
  );
}

export default ParentDashboard;