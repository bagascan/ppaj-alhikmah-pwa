import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Card, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { BsPersonVcard, BsTelephone, BsTruck } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';

function DriverProfile() {
  const [driver, setDriver] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Sesi tidak valid.");
        const user = JSON.parse(atob(token.split('.')[1])).user;
        if (user.role !== 'driver' || !user.profileId) throw new Error("Akses ditolak atau data tidak lengkap.");

        const driverRes = await api.get(`/drivers/${user.profileId}`);
        const currentDriver = driverRes.data;

        if (currentDriver) {
          setDriver(currentDriver);
          // Ambil riwayat perjalanan untuk supir ini
          const historyRes = await api.get(`/trips/history/driver/${user.profileId}`);
          setTripHistory(historyRes.data);
        } else {
          throw new Error("Tidak ada data supir di database.");
        }
      } catch (err) {
        setError("Gagal memuat data profil.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat profil...</p></div>;
  }

  if (error || !driver) {
    return <Alert variant="danger">{error || "Data supir tidak ditemukan."}</Alert>;
  }

  return (
    <>
      <h2>Profil Supir</h2>
      
      <Card className="mb-4 shadow-sm">
        <Card.Header as="h5" className="d-flex align-items-center">
          <BsPersonVcard className="me-2" /> Informasi Pribadi
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <h6 className="text-muted mb-0 d-flex align-items-center"><BsPersonVcard className="me-2" /> Nama</h6>
            <p className="fs-5">{driver.name}</p>
          </div>
          <div className="mb-3">
            <h6 className="text-muted mb-0 d-flex align-items-center"><BsTelephone className="me-2" /> Telepon</h6>
            <p className="fs-5">{driver.phone}</p>
          </div>
          <div>
            <h6 className="text-muted mb-0 d-flex align-items-center"><BsTruck className="me-2" /> Kendaraan & Zona</h6>
            <p className="fs-5 mb-0">{driver.vehicle}</p>
            <Badge bg="info">Zona {driver.zone}</Badge>
          </div>
        </Card.Body>
      </Card>

      <h4 className="mt-4 mb-3">Riwayat Perjalanan</h4>
      {tripHistory.length > 0 ? (
        <ListGroup>
          {tripHistory.map(log => (
            <ListGroup.Item key={log._id}>
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">{log.student.name}</h5>
                <small>{new Date(log.date).toLocaleDateString('id-ID')}</small>
              </div>
              <p className="mb-1">
                {log.events.map(event => `[${new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}] ${event.status}`).join(' -> ')}
              </p>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <Card className="text-center p-4 shadow-sm">
          <Card.Body><p className="text-muted mb-0">Belum ada riwayat perjalanan.</p></Card.Body>
        </Card>
      )}
    </>
  );
}

export default DriverProfile;