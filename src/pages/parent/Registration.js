import React, { useState } from 'react';
import { Form, Button, Card, Alert, Container, Row, Col } from 'react-bootstrap';
import { BsPersonPlusFill } from 'react-icons/bs';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Perbaikan untuk masalah ikon marker default dengan Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const surabayaPosition = [-7.2575, 112.7521];

// Komponen untuk memilih lokasi di peta
function LocationPicker({ position, onLocationSet }) {
  const map = useMapEvents({
    click(e) {
      onLocationSet(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function Registration({ setStudents }) {
  const initialFormState = {
    name: '',
    address: '',
    parent: '',
    phone: '',
    school: '',
    schoolAddress: '',
    location: null, // Untuk lokasi rumah
    schoolLocation: null, // Untuk lokasi sekolah
  };

  const [formData, setFormData] = useState(initialFormState);
  const [showAlert, setShowAlert] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    const newStudent = {
      id: Date.now(), // Simple unique ID
      ...formData,
      zone: 'Unassigned', // Admin will assign this later
      status: 'Active',
      pickupStatus: 'Pending',
      schedule: { pickup: '00:00', dropoff: '00:00' }, // Admin will set this
      // Pastikan lokasi sudah ada sebelum disimpan
      location: formData.location ? [formData.location.lat, formData.location.lng] : null,
      schoolLocation: formData.schoolLocation ? [formData.schoolLocation.lat, formData.schoolLocation.lng] : null,
    };

    setStudents(prevStudents => [...prevStudents, newStudent]);

    // Reset form and show success message
    setFormData(initialFormState);
    setValidated(false);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 5000); // Hide alert after 5 seconds

    console.log('New student registered:', newStudent);
  };

  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Header as="h3" className="text-center">Formulir Pendaftaran Siswa Baru</Card.Header>
            <Card.Body>
              {showAlert && (
                <Alert variant="success" onClose={() => setShowAlert(false)} dismissible>
                  Pendaftaran berhasil! Data siswa baru telah ditambahkan. Admin akan segera memverifikasi dan menetapkan zona.
                </Alert>
              )}
              <Form noValidate validated={validated} onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formStudentName">
                  <Form.Label>Nama Lengkap Siswa</Form.Label>
                  <Form.Control type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="Masukkan nama siswa" required minLength="3" />
                  <Form.Control.Feedback type="invalid">
                    Nama siswa harus diisi (minimal 3 karakter).
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3" controlId="formStudentAddress">
                  <Form.Label>Alamat Lengkap Penjemputan</Form.Label>
                  <Form.Control as="textarea" rows={3} name="address" value={formData.address} onChange={handleFormChange} placeholder="Contoh: Jl. Merdeka No. 1, Surabaya" required />
                  <Form.Control.Feedback type="invalid">
                    Alamat penjemputan harus diisi.
                  </Form.Control.Feedback>
                  <Card className="mt-2">
                    <Card.Header className="py-1">Titik Lokasi Rumah di Peta</Card.Header>
                    <MapContainer center={surabayaPosition} zoom={12} style={{ height: '200px' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <LocationPicker position={formData.location} onLocationSet={(latlng) => setFormData(prev => ({ ...prev, location: latlng }))} />
                    </MapContainer>
                    <Card.Footer className="py-1 text-muted small">
                      {formData.location ? `Lat: ${formData.location.lat.toFixed(5)}, Lng: ${formData.location.lng.toFixed(5)}` : 'Klik di peta untuk menentukan lokasi'}
                    </Card.Footer>
                  </Card>
                  <Form.Control.Feedback type="invalid" style={{ display: validated && !formData.location ? 'block' : 'none' }}>
                    Lokasi rumah di peta harus ditentukan.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3" controlId="formParentName">
                  <Form.Label>Nama Wali Murid</Form.Label>
                  <Form.Control type="text" name="parent" value={formData.parent} onChange={handleFormChange} placeholder="Masukkan nama Anda" required />
                  <Form.Control.Feedback type="invalid">
                    Nama wali murid harus diisi.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3" controlId="formParentPhone">
                  <Form.Label>Nomor Telepon (WhatsApp)</Form.Label>
                  <Form.Control type="tel" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="Contoh: 081234567890" required pattern="[0-9]{10,13}" />
                  <Form.Control.Feedback type="invalid">
                    Masukkan nomor telepon yang valid (10-13 digit angka).
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3" controlId="formSchoolName">
                  <Form.Label>Nama Sekolah</Form.Label>
                  <Form.Control type="text" name="school" value={formData.school} onChange={handleFormChange} placeholder="Contoh: SD Al-Hikmah" required />
                  <Form.Control.Feedback type="invalid">
                    Nama sekolah harus diisi.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3" controlId="formSchoolAddress">
                  <Form.Label>Alamat Sekolah</Form.Label>
                  <Form.Control type="text" name="schoolAddress" value={formData.schoolAddress} onChange={handleFormChange} placeholder="Contoh: Jl. Kebonsari No. 1, Surabaya" required />
                  <Form.Control.Feedback type="invalid">
                    Alamat sekolah harus diisi.
                  </Form.Control.Feedback>
                  <Card className="mt-2">
                    <Card.Header className="py-1">Titik Lokasi Sekolah di Peta</Card.Header>
                    <MapContainer center={surabayaPosition} zoom={12} style={{ height: '200px' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <LocationPicker position={formData.schoolLocation} onLocationSet={(latlng) => setFormData(prev => ({ ...prev, schoolLocation: latlng }))} />
                    </MapContainer>
                    <Card.Footer className="py-1 text-muted small">
                      {formData.schoolLocation ? `Lat: ${formData.schoolLocation.lat.toFixed(5)}, Lng: ${formData.schoolLocation.lng.toFixed(5)}` : 'Klik di peta untuk menentukan lokasi'}
                    </Card.Footer>
                  </Card>
                  <Form.Control.Feedback type="invalid" style={{ display: validated && !formData.schoolLocation ? 'block' : 'none' }}>
                    Lokasi sekolah di peta harus ditentukan.
                  </Form.Control.Feedback>
                </Form.Group>
                <div className="d-grid">
                  <Button variant="primary" type="submit" size="lg"><BsPersonPlusFill className="me-2" />Daftarkan Siswa</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Registration;