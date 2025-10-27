import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form } from 'react-bootstrap';
import { BsPencil, BsTrash } from 'react-icons/bs';
import { dummyZones } from '../../data/dummyData';

function ZoneModal({ show, onHide, zone, onSave }) {
  const [name, setName] = useState('');

  useEffect(() => {
    setName(zone ? zone.geojson.properties.name : '');
  }, [zone, show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Di aplikasi nyata, Anda juga akan menyimpan data geojson
    onSave({ ...zone, geojson: { ...zone?.geojson, properties: { name } } });
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{zone ? 'Edit Zona' : 'Tambah Zona Baru'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nama Zona</Form.Label>
            <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </Form.Group>
          <p className="text-muted small">Pengaturan poligon zona akan tersedia di versi selanjutnya.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Batal</Button>
          <Button variant="primary" type="submit">Simpan</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ZoneList() {
  const [zones, setZones] = useState(dummyZones);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const handleShowModal = (zone = null) => {
    setEditingZone(zone);
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = (zoneData) => {
    // Logika simpan data (saat ini hanya di state lokal)
    console.log("Saving zone:", zoneData);
    handleCloseModal();
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Daftar Zona</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>Tambah Zona</Button>
      </div>

      {zones.map(zone => (
        <Card key={zone.id} className="mb-3 shadow-sm border-0">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <Card.Title>{zone.geojson.properties.name}</Card.Title>
              <div>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowModal(zone)}><BsPencil /></Button>
                <Button variant="outline-danger" size="sm"><BsTrash /></Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}
      <ZoneModal
        show={showModal}
        onHide={handleCloseModal}
        zone={editingZone}
        onSave={handleSave}
      />
    </>
  );
}

export default ZoneList;