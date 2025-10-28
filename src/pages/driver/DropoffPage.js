import React, { useState, useEffect } from 'react';
import api from '../../api';
import { toast } from 'react-toastify';
import { Container, Card, Spinner, Alert, Badge, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

function DropoffPage() {
  const [driver, setDriver] = useState(null);
  const [studentsToDropoff, setStudentsToDropoff] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, loading: authLoading } = useAuth();

  const fetchData = async () => {
      try {
        setDataLoading(true);
        if (authLoading) return;
        if (!auth || auth.user.role !== 'driver') {
          setError("Akses ditolak.");
          setDataLoading(false);
          return;
        }

        const [driverRes, studentsRes] = await Promise.all([
          api.get(`/drivers/${auth.user.profileId}`),
          api.get('/students')
        ]);

        const currentDriver = driverRes.data;
        if (!currentDriver) throw new Error(`Tidak ada data supir di database.`);

        setDriver(currentDriver);

        // Filter siswa: hanya yang di zona supir, aktif, berlangganan layanan antar, dan statusnya 'at_school'
        const filteredStudents = studentsRes.data.filter(student => 
          student.zone === currentDriver.zone &&
          student.generalStatus === 'Active' &&
          student.service?.dropoff === true &&
          student.tripStatus === 'at_school'
        );

        setStudentsToDropoff(filteredStudents.sort((a, b) => a.name.localeCompare(b.name)));
        setError(null);

      } catch (err) {
        setError(err.message);
        toast.error("Gagal memuat data pengantaran.");
      } finally {
        setDataLoading(false);
      }
    };

  useEffect(() => {
    fetchData();
  }, [auth, authLoading]);

  const handleUpdateStatus = async (studentId, newStatus) => {
    setStudentsToDropoff(prevStudents =>
      prevStudents.filter(student => student._id !== studentId)
    );

    try {
      await api.put(`/students/${studentId}`, { tripStatus: newStatus });
      toast.success(`Siswa telah diantar pulang.`);
    } catch (err) {
      toast.error("Gagal memperbarui status. Memuat ulang data...");
      fetchData();
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
        <h2 className="mb-0">Daftar Antar Pulang</h2>
        <Badge bg="secondary">Zona {driver?.zone}</Badge>
      </div>

      {studentsToDropoff.length > 0 ? (
        studentsToDropoff.map(student => (
          <Card key={student._id} className="mb-3 shadow-sm">
            <Card.Body>
              <Row className="align-items-center">
                <Col>
                  <Card.Title className="mb-1">{student.name}</Card.Title>
                  <Card.Text className="text-muted small mb-2">{student.address}</Card.Text>
                  <Badge bg="info">Siap Diantar</Badge>
                </Col>
                <Col xs="auto">
                  <Button variant="info" onClick={() => handleUpdateStatus(student._id, 'dropped_off')}>
                    Antar Pulang
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))
      ) : (
        <Alert variant="success">Semua siswa di zona Anda telah diantar pulang.</Alert>
      )}
    </Container>
  );
}

export default DropoffPage;