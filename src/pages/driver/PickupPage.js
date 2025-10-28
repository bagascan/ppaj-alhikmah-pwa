import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { toast } from 'react-toastify';
import { Container, Card, Spinner, Alert, Badge, Button, ButtonGroup, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

function PickupPage() {
  const [driver, setDriver] = useState(null);
  const [studentsInZone, setStudentsInZone] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
      try {
        setDataLoading(true);
        if (authLoading) return;
        if (!auth || auth.user.role !== 'driver') {
          setError("Akses ditolak.");
          setDataLoading(false);
          return;
        }

        // Ambil data supir yang login dan semua siswa
        const [driverRes, studentsRes] = await Promise.all([
          api.get(`/drivers/${auth.user.profileId}`), // Endpoint baru untuk mengambil 1 supir
          api.get('/students')
        ]);
        const currentDriver = driverRes.data;
        if (!currentDriver) throw new Error(`Data supir tidak ditemukan.`);


        setDriver(currentDriver);

        // Filter siswa: hanya yang di zona supir, aktif, dan berlangganan layanan jemput pagi
        const filteredStudents = studentsRes.data.filter(student => 
          student.zone === currentDriver.zone &&
          student.generalStatus === 'Active' &&
          student.service?.pickup === true
        );

        setStudentsInZone(filteredStudents.sort((a, b) => a.name.localeCompare(b.name))); // Urutkan berdasarkan nama
        setError(null);

      } catch (err) {
        setError(err.message);
        toast.error("Gagal memuat data penjemputan.");
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    }, [auth, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (studentId, newStatus) => {
    // Optimistic UI update for a responsive feel
    setStudentsInZone(prevStudents =>
      prevStudents.map(student =>
        student._id === studentId ? { ...student, tripStatus: newStatus } : student
      )
    );

    try {
      await api.put(`/students/${studentId}`, { tripStatus: newStatus });
      toast.success(`Status untuk siswa telah diperbarui menjadi "${newStatus}"`);
    } catch (err) {
      toast.error("Gagal memperbarui status. Memuat ulang data...");
      console.error(err);
      fetchData(); // Re-fetch data on error to ensure consistency
    }
  };

  const getBadgeColor = (status) => {
    switch (status) {
      case 'picked_up': return 'success';
      case 'at_school': return 'info';
      case 'absent': return 'danger';
      case 'at_home':
      default: return 'primary';
    }
  };

  if (authLoading || dataLoading) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat daftar siswa...</p></div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Container className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Daftar Jemputan</h2>
        <Badge bg="secondary">Zona {driver?.zone}</Badge>
      </div>

      {studentsInZone.length > 0 ? (
        studentsInZone.map(student => (
          <Card key={student._id} className="mb-3 shadow-sm">
            <Card.Body>
              <Row className="align-items-center">
                <Col>
                  <Card.Title className="mb-1">{student.name}</Card.Title>
                  <Card.Text className="text-muted small mb-2">{student.address}</Card.Text>
                  <Badge bg={getBadgeColor(student.tripStatus)}>{student.tripStatus.replace('_', ' ')}</Badge>
                </Col>
                <Col xs="auto">
                  <ButtonGroup>
                    {student.tripStatus === 'at_home' && (
                      <>
                        <Button variant="success" onClick={() => handleUpdateStatus(student._id, 'picked_up')}>
                          Jemput
                        </Button>
                        <Button variant="outline-danger" onClick={() => handleUpdateStatus(student._id, 'absent')}>Absen</Button>
                      </>
                    )}
                    {student.tripStatus === 'picked_up' && (
                      <Button variant="primary" onClick={() => handleUpdateStatus(student._id, 'at_school')}>
                        Tiba di Sekolah
                      </Button>
                    )}
                  </ButtonGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))
      ) : (
        <Alert variant="info">Tidak ada siswa yang perlu dijemput di zona Anda saat ini.</Alert>
      )}
    </Container>
  );
}

export default PickupPage;