import React, { useState } from 'react';
import { Card, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { BsBroadcast, BsStopCircle, BsExclamationTriangle } from 'react-icons/bs';
import { toast } from 'react-toastify';
import api from '../../api'; // Gunakan instance api kustom

function RequestChangeModal({ show, onHide, driverId }) {
  const [reason, setReason] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendRequest = async () => {
    if (!reason.trim()) {
      toast.warn("Alasan permohonan tidak boleh kosong.");
      return;
    }
    setIsSending(true);
    try {
      const res = await api.post('/notifications/request-change', { driverId, reason });
      toast.success(res.data.msg || "Permohonan berhasil dikirim.");
      setReason('');
      onHide();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal mengirim permohonan.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Minta Ganti Supir</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small">Admin akan menerima notifikasi push berisi permohonan Anda.</p>
        <Form.Group>
          <Form.Label>Alasan Permohonan (Contoh: Ban kempes, sakit, dll.)</Form.Label>
          <Form.Control as="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Batal</Button>
        <Button variant="danger" onClick={handleSendRequest} disabled={isSending}>
          {isSending ? <Spinner as="span" size="sm" /> : 'Kirim Permohonan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function DriverHome({ loading, isTracking, locationError, handleToggleTracking, driverId }) {
  const [showRequestModal, setShowRequestModal] = useState(false);

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat data...</p></div>;
  }

  return (
    <>
      <h2>Dasbor Supir</h2>
      <Card className="text-center mb-4">
        <Card.Body>
          <Card.Title>Status Pelacakan Lokasi</Card.Title>
          <p>Aktifkan pelacakan agar wali murid dapat melihat posisi Anda secara real-time.</p>
          <Button variant={isTracking ? "danger" : "success"} size="lg" onClick={handleToggleTracking}>
            {isTracking ? <><BsStopCircle className="me-2" /> Hentikan Pelacakan</> : <><BsBroadcast className="me-2" /> Mulai Lacak</>}
          </Button>
          {locationError && <Alert variant="warning" className="mt-3">{locationError}</Alert>}
        </Card.Body>
      </Card>

      <Card className="text-center bg-light-subtle">
        <Card.Body>
          <Card.Title>Tindakan Darurat</Card.Title>
          <p>Gunakan tombol ini jika Anda mengalami kendala mendesak di jalan.</p>
          <Button variant="outline-danger" onClick={() => setShowRequestModal(true)} disabled={!driverId}>
            <BsExclamationTriangle className="me-2" /> Minta Ganti Supir
          </Button>
        </Card.Body>
      </Card>

      <RequestChangeModal show={showRequestModal} onHide={() => setShowRequestModal(false)} driverId={driverId} />
    </>
  );
}

export default DriverHome;