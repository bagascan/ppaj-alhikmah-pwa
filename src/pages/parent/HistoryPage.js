import React, { useState, useEffect } from 'react';
import api from '../../api'; // Gunakan instance api kustom
import { ListGroup, Spinner, Alert, Card } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

function ParentHistoryPage() {
  const [tripHistory, setTripHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!auth) {
        setDataLoading(false);
        setError("Sesi tidak valid.");
        return;
      }
      try {
        const historyRes = await api.get(`/trips/history/parent`);
        setTripHistory(historyRes.data);
      } catch (err) {
        setError("Gagal memuat riwayat perjalanan.");
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [auth, authLoading]);

  if (authLoading || dataLoading) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat riwayat...</p></div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      <h2>Riwayat Perjalanan</h2>
      {tripHistory.length > 0 ? (
        <ListGroup>
          {tripHistory.map(log => (
            <ListGroup.Item key={log._id}>
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">Ananda: {log.student.name}</h5>
                <small>{new Date(log.date).toLocaleDateString('id-ID')}</small>
              </div>
              <p className="mb-1">
                {log.events.map(event => `[${new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}] ${event.status}`).join(' -> ')}
              </p>
              <small className="text-muted">Diantar oleh: {log.driver?.name || 'N/A'}</small>
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

export default ParentHistoryPage;