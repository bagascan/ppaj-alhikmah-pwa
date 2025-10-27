import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../../api';
import { toast } from 'react-toastify';

function ParentChatListPage() {
  const [driverList, setDriverList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDriverList = async () => {
      try {
        // Panggil endpoint baru yang aman untuk wali murid
        const res = await api.get('/drivers/for-parent');
        setDriverList(res.data);
      } catch (err) {
        setError(err.message || "Gagal memuat daftar supir.");
        toast.error("Gagal memuat daftar supir.");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverList();
  }, []);

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat daftar...</p></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      <h2 className="mt-3">Pilih Supir untuk Chat</h2>
      {driverList.length > 0 ? (
        driverList.map((driver) => (
          <Card as={Link} to={`/parent/chat/${driver._id}`} key={driver._id} className="mb-3 text-decoration-none text-dark shadow-sm">
            <Card.Body>
              <Card.Title className="mb-1">{driver.name}</Card.Title>
              <Card.Text className="text-muted small">Supir untuk Zona {driver.zone}</Card.Text>
            </Card.Body>
          </Card>
        ))
      ) : (
        <Alert variant="info">Tidak ada supir yang ditugaskan untuk anak Anda saat ini.</Alert>
      )}
    </>
  );
}

export default ParentChatListPage;