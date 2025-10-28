import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, ListGroup, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../api';
import { toast } from 'react-toastify';
import { BsPerson, BsGeoAlt, BsCheckCircle, BsXCircle, BsQuestionCircle, BsArrowRightCircle } from 'react-icons/bs';
import { useAuth } from '../../hooks/useAuth';
import pusher from '../../pusher';

function ParentHome() {
  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, loading: authLoading } = useAuth();
  const userName = auth?.user?.name || '';

  useEffect(() => {
    const fetchStudents = async () => {
      if (authLoading || !auth) {
        if (!authLoading) setDataLoading(false);
        return;
      }

      try {
        const res = await api.get('/students/my-students');
        setStudents(res.data || []);
      } catch (err) {
        setError("Gagal memuat data siswa. Silakan coba lagi nanti.");
        toast.error("Gagal memuat data siswa.");
      } finally {
        setDataLoading(false);
      }
    };

    fetchStudents();
  }, [auth, authLoading]);

  // Efek untuk mendengarkan update status siswa secara real-time
  useEffect(() => {
    if (!auth || auth.user.role !== 'parent') return;

    const parentId = auth.user.profileId;
    const channel = pusher.subscribe(`private-parent-${parentId}`);

    channel.bind('student-status-update', (data) => {
      toast.info(data.message); // Tampilkan notifikasi toast
      // Perbarui state siswa secara lokal
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.name === data.studentName ? { ...student, tripStatus: data.status } : student
        )
      );
    });

    return () => {
      pusher.unsubscribe(`private-parent-${parentId}`);
    };
  }, [auth]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'at_home':
        return { text: 'Menunggu Jemputan', variant: 'primary', icon: <BsPerson /> };
      case 'picked_up':
        return { text: 'Dalam Perjalanan ke Sekolah', variant: 'info', icon: <BsArrowRightCircle /> };
      case 'at_school':
        return { text: 'Telah Tiba di Sekolah', variant: 'success', icon: <BsCheckCircle /> };
      case 'dropped_off':
        return { text: 'Telah Diantar Pulang', variant: 'secondary', icon: <BsCheckCircle /> };
      case 'absent':
        return { text: 'Absen', variant: 'danger', icon: <BsXCircle /> };
      default:
        return { text: 'Status Tidak Diketahui', variant: 'warning', icon: <BsQuestionCircle /> };
    }
  };

  if (authLoading || dataLoading) return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat data...</p></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <h2 className="mt-3">Selamat Datang, {userName}</h2>
      <p>Berikut adalah status antar-jemput anak Anda hari ini.</p>

      {students.length > 0 ? (
        <ListGroup>
          {students.map(student => {
            const statusInfo = getStatusInfo(student.tripStatus);
            return (
              <ListGroup.Item key={student._id} className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-bold">{student.name}</div>
                  <div className="text-muted small"><BsGeoAlt className="me-1" /> Zona {student.zone}</div>
                </div>
                <Badge bg={statusInfo.variant} pill className="d-flex align-items-center p-2">
                  {statusInfo.icon} <span className="ms-1">{statusInfo.text}</span>
                </Badge>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      ) : (
        <Alert variant="info">Anda belum memiliki data siswa yang terdaftar. Silakan hubungi admin.</Alert>
      )}

      <Card as={Link} to="/parent/track" className="text-decoration-none text-dark shadow-sm mt-4 text-center">
        <Card.Body>
          <Card.Title>Lacak Lokasi Shuttle Sekarang</Card.Title>
        </Card.Body>
      </Card>
    </>
  );
}

export default ParentHome;
