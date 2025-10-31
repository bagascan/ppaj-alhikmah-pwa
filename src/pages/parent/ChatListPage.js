import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert, ListGroup } from 'react-bootstrap';
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
      <h2>Pilih Supir</h2>
      <Card>
        <ListGroup variant="flush">
          {driverList.length > 0 ? (
            driverList.map(driver => (
              <ListGroup.Item action as={Link} to={`/parent/chat/${driver._id}`} key={driver._id}>
                <div className="fw-bold">{driver.name}</div>
                <small className="text-muted">Supir untuk Zona {driver.zone}</small>
              </ListGroup.Item>
            ))
          ) : (
            // PERBAIKAN: Tambahkan prop 'key' yang unik
            <ListGroup.Item key="no-drivers">
              Tidak ada supir yang terhubung dengan anak Anda.
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card>
    </>
  );
}

export default ParentChatListPage;