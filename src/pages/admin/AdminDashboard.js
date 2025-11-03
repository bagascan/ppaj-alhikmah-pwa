import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api';
import { BsMegaphone } from 'react-icons/bs';
import NotificationButton from '../../components/NotificationButton'; // PERBAIKAN: Impor komponen baru
import { useAuth } from '../../hooks/useAuth';
import FleetMonitor from './FleetMonitor';
import StudentList from './StudentList';
import DriverList from './DriverList';
import ZoneEditor from './ZoneEditor'; // Ganti ZoneList menjadi ZoneEditor
import SchoolList from './SchoolList';
import ReportPage from './ReportPage';

function AdminHome() {
  const [zones, setZones] = useState([]);
  const [message, setMessage] = useState('');
  const [targetZone, setTargetZone] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const { auth } = useAuth();

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get('/zones');
        setZones(res.data);
      } catch (err) {
        console.error("Gagal memuat zona.");
      }
    };
    fetchZones();
  }, []); // PERBAIKAN: Hapus dependensi auth

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      toast.warn("Pesan tidak boleh kosong.");
      return;
    }
    setIsSending(true);
    try {
      const res = await api.post('/notifications/broadcast', { message, targetZone });
      toast.success(res.data.msg || "Notifikasi berhasil dikirim.");
      setMessage('');
    } catch (err) {
      toast.error("Gagal mengirim notifikasi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <h2>Dasbor Admin</h2>
      <p>Selamat datang di dasbor admin. Silakan pilih menu di bawah untuk mengelola data.</p>
      
      {/* PERBAIKAN: Tambahkan tombol notifikasi */}
      {auth && <NotificationButton userId={auth.user.id} />}

      <Card className="mt-4">
        <Card.Header as="h5" className="d-flex align-items-center"><BsMegaphone className="me-2" /> Kirim Pengumuman ke Supir</Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Pesan Pengumuman</Form.Label>
            <Form.Control as="textarea" rows={3} placeholder="Contoh: Ada perbaikan jalan di Jl. Mawar, harap berhati-hati." value={message} onChange={(e) => setMessage(e.target.value)} />
          </Form.Group>
          <Row>
            <Col md={8}>
              <Form.Group>
                <Form.Label>Kirim ke Zona</Form.Label>
                <Form.Select value={targetZone} onChange={(e) => setTargetZone(e.target.value)}>
                  <option value="all">Semua Supir</option>
                  {zones.map(zone => <option key={zone._id} value={zone.name}>{zone.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button variant="primary" className="w-100 mt-2" onClick={handleSendBroadcast} disabled={isSending}>
                {isSending ? <Spinner as="span" size="sm" /> : 'Kirim Notifikasi'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
}

function AdminDashboard() {
  return (
    <Container>
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="students" element={<StudentList />} />
        <Route path="schools" element={<SchoolList />} />
        <Route path="drivers" element={<DriverList />} />
        <Route path="zones" element={<ZoneEditor />} />
        <Route path="monitor" element={<FleetMonitor />} />
        <Route path="reports" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Container>
  );
}

export default AdminDashboard;