import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Card, Button, Modal, Form, InputGroup, Badge, Row, Col } from 'react-bootstrap';
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

function StudentModal({ show, onHide, student, schools, zones, drivers, onSave }) {
  const [formData, setFormData] = useState({});
  const [assignedDriver, setAssignedDriver] = useState(null);

  useEffect(() => {
    if (student) {
      // Saat edit, isi form dengan data siswa, termasuk service
      setFormData({
        ...student,
        school: student.school?._id || '',
        service: student.service ?? { pickup: true, dropoff: true }, // Gunakan nullish coalescing
        location: student.location?.coordinates ? [student.location.coordinates[1], student.location.coordinates[0]] : [-7.2575, 112.7521]
      });
      // PERBAIKAN: Cari dan tampilkan supir saat modal edit dibuka
      if (student.zone && drivers) {
        const driverForZone = drivers.find(d => d.zone === student.zone);
        setAssignedDriver(driverForZone || null);
      }
    } else {
      // Saat tambah baru, reset form dengan nilai default
      setFormData({
        name: '',
        address: '',
        parent: '',
        school: '',
        zone: '',
        generalStatus: 'Active',
        service: { pickup: true, dropoff: true }, // Tetap seperti ini
        parentEmail: '',
        parentPassword: '',
        location: [-7.2575, 112.7521] // Default ke Surabaya
      });
      setAssignedDriver(null); // Reset info supir hanya saat menambah siswa baru
    }
  }, [student, show, drivers]); // Hapus `setAssignedDriver(null)` dari sini
  
  // useEffect terpisah untuk menangani pembaruan supir saat zona berubah
  useEffect(() => {
    // Efek ini berjalan setiap kali zona di form berubah,
    // memastikan info supir yang ditampilkan selalu sinkron.
    if (formData.zone && drivers) {
      const driverForZone = drivers.find(d => d.zone === formData.zone);
      setAssignedDriver(driverForZone || null);
    } else {
      // Jika tidak ada zona yang dipilih, pastikan tidak ada supir yang ditampilkan.
      setAssignedDriver(null);
    }
  }, [formData.zone, drivers]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      service: { ...prev.service, [name]: checked }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [formData.location[1], formData.location[0]] // [lng, lat]
      }
    };
    onSave(dataToSave);
  };

  const handleMapClick = async (latlng) => {
    setFormData(prev => ({ ...prev, location: [latlng.lat, latlng.lng] }));
    try {
      // Panggil API untuk mencari zona berdasarkan koordinat
      const res = await api.get(`/zones/by-coords?lat=${latlng.lat}&lng=${latlng.lng}`);
      if (res.data && res.data.zone) {
        // Jika zona ditemukan, perbarui state secara bersamaan
        setFormData(prev => ({ ...prev, zone: res.data.zone.name, location: [latlng.lat, latlng.lng] }));
        toast.success(`Lokasi berada di ${res.data.zone.name}. Zona telah diisi otomatis.`);
        // Tampilkan info supir jika ada
        setAssignedDriver(res.data.driver);
      } else {
        toast.warn("Lokasi tidak masuk dalam zona layanan manapun.");
        setAssignedDriver(null);
      }
    } catch (error) {
      toast.error("Gagal menentukan zona dari lokasi.");
      setAssignedDriver(null);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{student ? 'Edit Siswa' : 'Tambah Siswa Baru'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <h5>Data Siswa</h5>
              <Form.Group className="mb-3">
                <Form.Label>Nama Siswa</Form.Label>
                <Form.Control type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Alamat</Form.Label>
                <Form.Control as="textarea" rows={1} name="address" value={formData.address || ''} onChange={handleChange} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Titik Jemput (Klik di Peta)</Form.Label>
                <MapContainer center={formData.location} zoom={13} style={{ height: '150px', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ClickHandler onMapClick={handleMapClick} />
                  {formData.location && (
                    <Marker position={formData.location} icon={defaultIcon}></Marker>
                  )}
                  <MapUpdater center={formData.location} zoom={15} />
                </MapContainer>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Sekolah</Form.Label>
                <Form.Select name="school" value={formData.school || ''} onChange={handleChange} required>
                  <option value="">Pilih Sekolah</option>
                  {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Zona</Form.Label>
                <Form.Select name="zone" value={formData.zone || ''} onChange={handleChange} required>
                  <option value="">Pilih Zona</option>
                  {zones.map(z => (
                    <option key={z._id} value={z.name}>{z.name}</option>
                  ))}
                </Form.Select>
                {assignedDriver && (
                  <Form.Text className="text-success fw-bold">
                    Supir di zona ini: {assignedDriver.name}
                  </Form.Text>
                )}
                {!assignedDriver && formData.zone && (
                   <Form.Text className="text-warning">
                    Belum ada supir yang ditugaskan untuk zona ini.
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col md={6}>
              <h5>Data Wali Murid & Layanan</h5>
              <Form.Group className="mb-3">
                <Form.Label>Nama Wali Murid</Form.Label>
                <Form.Control type="text" name="parent" value={formData.parent || ''} onChange={handleChange} required />
              </Form.Group>

              {/* Kolom email dan password hanya muncul saat menambah siswa baru */}
              {!student && (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Wali Murid (untuk Login)</Form.Label>
                    <Form.Control type="email" name="parentEmail" value={formData.parentEmail || ''} onChange={handleChange} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Password Awal Wali Murid</Form.Label>
                    <Form.Control type="password" name="parentPassword" value={formData.parentPassword || ''} onChange={handleChange} required />
                  </Form.Group>
                </>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Layanan Antar-Jemput</Form.Label>
                <div>
                  <Form.Check inline type="checkbox" label="Jemput (Pagi)" name="pickup" checked={formData.service?.pickup ?? false} onChange={handleServiceChange} />
                  <Form.Check inline type="checkbox" label="Antar (Siang)" name="dropoff" checked={formData.service?.dropoff ?? false} onChange={handleServiceChange} />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Batal</Button>
          <Button variant="primary" type="submit">Simpan</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function StudentList() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [drivers, setDrivers] = useState([]); // Tambahkan state untuk supir
  const [zones, setZones] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Jika tidak ada token, jangan fetch data. Biarkan ProtectedRoute bekerja.
      return;
    }

    try {
      const [studentsRes, schoolsRes, zonesRes, driversRes] = await Promise.all([
        api.get('/students'),
        api.get('/schools'),
        api.get('/zones'),
        api.get('/drivers') // Ambil juga data supir
      ]);
      setStudents(studentsRes.data);
      setSchools(schoolsRes.data);
      setZones(zonesRes.data);
      setDrivers(driversRes.data); // Simpan data supir
    } catch (err) {
      toast.error("Gagal memuat data.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleShowModal = (student = null) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSave = async (studentData) => {
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent._id}`, studentData);
        toast.success('Data siswa berhasil diperbarui!');
      } else {
        // Saat membuat siswa baru, kirim juga data untuk membuat akun wali murid
        const payload = {
          ...studentData,
          parentUserData: {
            name: studentData.parent, // Nama wali murid diambil dari form
            email: studentData.parentEmail,
            password: studentData.parentPassword,
          }
        };
        await api.post('/students', payload);
        toast.success('Siswa baru berhasil ditambahkan!');
      }
      fetchData();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Gagal menyimpan data siswa.');
    }
  };

  const handleDelete = async (studentId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus siswa ini? Ini tidak akan menghapus akun wali murid.')) {
      try {
        await api.delete(`/students/${studentId}`);
        toast.success('Siswa berhasil dihapus.');
        fetchData();
      } catch (err) {
        toast.error('Gagal menghapus siswa.');
      }
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lowercasedTerm = searchTerm.toLowerCase();
    return students.filter(student => {
      // Cari supir yang sesuai dengan zona siswa
      const driverForZone = drivers.find(d => d.zone === student.zone);

      return (
        student.name.toLowerCase().includes(lowercasedTerm) ||
        student.parent.toLowerCase().includes(lowercasedTerm) ||
        student.zone.toLowerCase().includes(lowercasedTerm) ||
        student.school?.name.toLowerCase().includes(lowercasedTerm) ||
        (driverForZone && driverForZone.name.toLowerCase().includes(lowercasedTerm)) // Tambahkan pencarian berdasarkan nama supir
      );
    });
  }, [students, searchTerm, drivers]); // Tambahkan drivers ke dependency array

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Daftar Siswa</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>Tambah Siswa</Button>
      </div>
      <InputGroup className="mb-3">
        <InputGroup.Text><BsSearch /></InputGroup.Text>
        <Form.Control placeholder="Cari berdasarkan nama siswa, wali, supir, zona, atau sekolah..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </InputGroup>
      {filteredStudents.length === 0 && <p>Tidak ada siswa yang cocok dengan pencarian Anda.</p>}
      {filteredStudents.map(student => {
        // Cari supir yang sesuai dengan zona siswa
        const driverForZone = drivers.find(d => d.zone === student.zone);

        return (
          <Card key={student._id} className="mb-3 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <Card.Title>{student.name} <Badge bg="info">Zona {student.zone}</Badge></Card.Title>
                  <p className="mb-1 small text-muted">Wali: {student.parent}</p>
                  <p className="mb-1 small text-muted">Sekolah: {student.school?.name || 'N/A'}</p>
                  <p className="mb-0 small">
                    <span className="text-muted">Supir: </span>
                    {driverForZone ? (
                      <span className="fw-bold">{driverForZone.name}</span>
                    ) : (
                      <span className="text-danger fst-italic">Belum Ditugaskan</span>
                    )}
                  </p>
                </div>
                <div>
                  <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowModal(student)}><BsPencil /></Button>
                  <Button variant="outline-danger" size="sm" onClick={() => handleDelete(student._id)}><BsTrash /></Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        );
      })}
      <StudentModal show={showModal} onHide={handleCloseModal} student={editingStudent} schools={schools} zones={zones} drivers={drivers} onSave={handleSave} />
    </>
  );
}

export default StudentList;