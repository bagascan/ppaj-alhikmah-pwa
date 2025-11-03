import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Card, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { BsPersonVcard, BsTelephone, BsTruck } from 'react-icons/bs';
import { useAuth } from '../../hooks/useAuth';

function DriverProfile() {
  const [driver, setDriver] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      // Jangan fetch data jika otentikasi masih loading atau tidak ada
      if (authLoading || !auth || auth.user.role !== 'driver') {
        if (!authLoading) {
          setError("Akses ditolak atau data tidak lengkap.");
          setDataLoading(false);
        }
        return;
      }

      try {
        const [driverRes, historyRes] = await Promise.all([
          api.get(`/drivers/${auth.user.profileId}`),
          api.get(`/trips/history/driver/${auth.user.profileId}`)
        ]);
        setDriver(driverRes.data);
        setTripHistory(historyRes.data);
      } catch (err) {
        setError("Gagal memuat data profil.");
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [auth, authLoading]);

  if (authLoading || dataLoading) {
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