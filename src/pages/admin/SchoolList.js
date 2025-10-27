import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Card, Button, Modal, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { BsPencil, BsTrash, BsSearch } from 'react-icons/bs';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

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

function SchoolModal({ show, onHide, school, onSave }) {
  const defaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const [formData, setFormData] = useState({ name: '', address: '', location: [0, 0] });  
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (school) {
      // Gunakan struktur data yang konsisten
      const location = school.location && school.location.coordinates ? [school.location.coordinates[1], school.location.coordinates[0]] : [0,0];
      setFormData({ ...school, address: school.address || '', location }); 
    } else {
      setFormData({ name: '', address: '', location: [-7.2575, 112.7521] });
    }
  }, [school, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e, index) => {
   // console.log("Direct location change is disabled.");
  };

  const handleMapClick = (latlng) => {
    setFormData(prev => ({
      ...prev, location: [latlng.lat, latlng.lng]
    }));
  };

  // PERBAIKAN 1: Menambahkan 'async'
  const handleSubmit = (e) => {
    e.preventDefault();
    // Konversi lokasi kembali ke format GeoJSON Point [longitude, latitude]
    const dataToSave = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [formData.location[1], formData.location[0]]
      }
    };
    onSave(dataToSave); 
  }; // <-- TUTUP FUNGSI handleSubmit di sini


  // PERBAIKAN 2: 'return' JSX diletakkan di akhir komponen
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>

       <Modal.Title>{school ? 'Edit Sekolah' : 'Tambah Sekolah Baru'}</Modal.Title>
     </Modal.Header>
     <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nama Sekolah</Form.Label>
            <Form.Control 
               type="text" 
               name="name" 
               value={formData.name || ''} 
                onChange={handleChange} 
               required 
            />
          </Form.Group>
            <Form.Group className="mb-3">
            <Form.Label>Alamat Sekolah</Form.Label>
            <Form.Control 
               type="text" 
               name="address" 
               value={formData.address || ''} 
                onChange={handleChange} 
               required 
            />
            </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Lokasi Sekolah</Form.Label>
            <MapContainer
              center={formData.location}
              zoom={13}
              style={{ height: '200px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ClickHandler setLocation={handleMapClick} />
              {formData.location && <Marker position={formData.location} icon={defaultIcon} />}
              <MapUpdater center={formData.location} zoom={15} />
            </MapContainer>
          </Form.Group>
         


        </Modal.Body>
        <Modal.Footer>
         <Button variant="secondary" onClick={onHide} disabled={isGeocoding}>Batal</Button>
         <Button variant="primary" type="submit">
            Simpan
         </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ClickHandler({ setLocation }) {
  const map = useMapEvents({
    click: (e) => {
      setLocation(e.latlng);
    },
  });
  return null;
}

function SchoolList() {
  const [schools, setSchools] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSchools = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // Jika tidak ada token, jangan fetch data. Biarkan ProtectedRoute bekerja.
        return;
      }

      try {
        const res = await api.get('/schools');
        setSchools(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSchools();
  }, []);

  const handleCloseModal = () => setShowModal(false);

  const handleShowModal = (school = null) => {
    setEditingSchool(school);
    setShowModal(true);
  };

  const handleSave = async (schoolData) => {
    try {
      if (editingSchool) {
        await api.put(`/schools/${editingSchool._id}`, schoolData);
        toast.success('School updated successfully!');
      } else {
        await api.post('/schools', schoolData);
        toast.success('School added successfully!');
      }
      const res = await api.get('/schools');
      setSchools(res.data);
      handleCloseModal();
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong!');
    }
  };

  const handleDelete = async (schoolId) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
        await api.delete(`/schools/${schoolId}`);
        toast.success('School deleted successfully!');
        const res = await api.get('/schools');
        setSchools(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Something went wrong!');
      }
    }
  };

  const filteredSchools = useMemo(() => {
    if (!searchTerm) {
      return schools;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return schools.filter(school =>
      school.name.toLowerCase().includes(lowercasedTerm) ||
      school.address.toLowerCase().includes(lowercasedTerm)
    );
  }, [schools, searchTerm]);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Daftar Sekolah</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>Tambah Sekolah</Button>
      </div>
      <InputGroup className="mb-3">
        <InputGroup.Text><BsSearch /></InputGroup.Text>
        <Form.Control placeholder="Cari berdasarkan nama atau alamat sekolah..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </InputGroup>
      {filteredSchools.length === 0 && <p>Tidak ada sekolah yang cocok dengan pencarian Anda.</p>}

      {filteredSchools.map(school => (
        <Card key={school._id} className="mb-3 shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <Card.Title>{school.name}</Card.Title>
                <p className="mb-1 small"><span className="text-muted">Lat:</span> {school.location.coordinates[1]}</p>
                <p className="mb-1 small"><span className="text-muted">Long:</span> {school.location.coordinates[0]}</p>
                <p className="mb-0 small"><span className="text-muted">Alamat:</span> {school.address}</p>
              </div>
              <div>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowModal(school)}>
                  <BsPencil />
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(school._id)}>
                  <BsTrash />
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}
      <SchoolModal
        show={showModal}
        onHide={handleCloseModal}
        school={editingSchool}
        onSave={handleSave}
      />
    </>
  );
}

export default SchoolList;