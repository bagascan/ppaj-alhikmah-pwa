import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Card, Button, Modal, Form, InputGroup, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BsPencil, BsTrash, BsSearch } from 'react-icons/bs';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
}

// Komponen baru untuk auto-zoom dan auto-center peta
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

function DriverModal({ show, onHide, driver, onSave, zones }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (driver) {
      setFormData({
        ...driver,
        location: driver.location?.coordinates ? [driver.location.coordinates[1], driver.location.coordinates[0]] : [-7.2575, 112.7521]
      });
    } else {
      // Reset form untuk supir baru, termasuk email dan password
      setFormData({ name: '', phone: '', vehicle: '', zone: '', email: '', password: '', location: [-7.2575, 112.7521] });
    }
  }, [driver, show]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleMapClick = (latlng) => {
    setFormData(prev => ({ ...prev, location: [latlng.lat, latlng.lng] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      location: { type: 'Point', coordinates: [formData.location[1], formData.location[0]] }
    };
    onSave(dataToSave);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{driver ? 'Edit Supir' : 'Tambah Supir Baru'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nama Supir</Form.Label>
            <Form.Control type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Telepon</Form.Label>
            <Form.Control type="text" name="phone" value={formData.phone || ''} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Kendaraan</Form.Label>
            <Form.Control type="text" name="vehicle" value={formData.vehicle || ''} onChange={handleChange} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Lokasi Garasi (Klik di Peta)</Form.Label>
            <MapContainer center={formData.location} zoom={13} style={{ height: '200px', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickHandler onMapClick={handleMapClick} />
              {formData.location && (
                <Marker position={formData.location} icon={defaultIcon}></Marker>
              )}
              <MapUpdater center={formData.location} zoom={15} />
            </MapContainer>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Zona</Form.Label>
            <Form.Select name="zone" value={formData.zone || ''} onChange={handleChange} required>
              <option value="">Pilih Zona</option>
              {zones.map(z => (
                <option key={z._id} value={z.name}>{z.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          {/* Tambahkan field ini hanya saat membuat supir baru */}
          {!driver && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Email Supir (untuk Login)</Form.Label>
                <Form.Control type="email" name="email" value={formData.email || ''} onChange={handleChange} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password Awal Supir</Form.Label>
                <Form.Control type="password" name="password" value={formData.password || ''} onChange={handleChange} required />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Batal</Button>
          <Button variant="primary" type="submit">Simpan</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function DriverList() {
  const [drivers, setDrivers] = useState([]);
  const [zones, setZones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Jika tidak ada token, jangan fetch data. Biarkan ProtectedRoute bekerja.
      return;
    }

    try {
      // Ambil data supir dan zona secara bersamaan
      const [driversRes, zonesRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/zones')
      ]);
      setDrivers(driversRes.data);
      setZones(zonesRes.data);
    } catch (err) {
      toast.error("Gagal memuat data.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleShowModal = (driver = null) => {
    setEditingDriver(driver);
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (driverData) => {
    try {
      if (editingDriver) {
        await api.put(`/drivers/${editingDriver._id}`, driverData);
        toast.success('Data supir berhasil diperbarui!');
      } else {
        // Saat membuat supir baru, kirim juga data untuk membuat akun user-nya
        const payload = {
          ...driverData,
          userData: {
            email: driverData.email,
            password: driverData.password,
          }
        };
        await api.post('/drivers', payload);
        toast.success('Supir baru berhasil ditambahkan!');
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      toast.error('Gagal menyimpan data supir.');
    }
  };

  const handleDelete = async (driverId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus supir ini?')) {
      try {
        await api.delete(`/drivers/${driverId}`);
        toast.success('Supir berhasil dihapus.');
        fetchData();
      } catch (err) {
        toast.error('Gagal menghapus supir.');
      }
    }
  };

  const filteredDrivers = useMemo(() => {
    if (!searchTerm) return drivers;
    const lowercasedTerm = searchTerm.toLowerCase();
    return drivers.filter(driver =>
      driver.name.toLowerCase().includes(lowercasedTerm) ||
      driver.phone.toLowerCase().includes(lowercasedTerm) ||
      driver.vehicle.toLowerCase().includes(lowercasedTerm) ||
      driver.zone.toLowerCase().includes(lowercasedTerm)
    );
  }, [drivers, searchTerm]);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Daftar Supir</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>Tambah Supir</Button>
      </div>
      <InputGroup className="mb-3">
        <InputGroup.Text><BsSearch /></InputGroup.Text>
        <Form.Control placeholder="Cari berdasarkan nama, telepon, kendaraan, atau zona..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </InputGroup>
      {filteredDrivers.length === 0 && <p>Tidak ada supir yang cocok dengan pencarian Anda.</p>}
      {filteredDrivers.map(driver => (
        <Card key={driver._id} className="mb-3 shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <Card.Title>{driver.name} <Badge bg="info">Zona: {driver.zone}</Badge></Card.Title>
                <p className="mb-1 small text-muted">Telepon: {driver.phone}</p>
                <p className="mb-0 small text-muted">Kendaraan: {driver.vehicle}</p>
              </div>
              <div>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowModal(driver)}><BsPencil /></Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(driver._id)}><BsTrash /></Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}
      <DriverModal show={showModal} onHide={handleCloseModal} driver={editingDriver} onSave={handleSave} zones={zones} />
    </>
  );
}

export default DriverList;