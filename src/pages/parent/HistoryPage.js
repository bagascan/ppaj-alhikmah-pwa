import React, { useState, useEffect } from 'react';
import api from '../../api'; // Gunakan instance api kustom
import { ListGroup, Spinner, Alert, Card } from 'react-bootstrap';

function ParentHistoryPage() {
  const [tripHistory, setTripHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parentName, setParentName] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(atob(token.split('.')[1])).user;
      if (user.role === 'parent') setParentName(user.profileId);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!parentName) return; // Jangan fetch jika parentName belum ada
      try {
        const historyRes = await api.get(`/trips/history/parent/${parentName}`);
        setTripHistory(historyRes.data);
      } catch (err) {
        setError("Gagal memuat riwayat perjalanan.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [parentName]);

  if (loading) {
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