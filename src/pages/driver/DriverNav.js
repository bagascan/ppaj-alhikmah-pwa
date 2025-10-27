import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, Row, Col, ListGroup, Button, Spinner, Alert, Nav, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import L from 'leaflet';
import { socket } from '../../socket';
import { BsPerson, BsFlagFill, BsCheckCircleFill } from 'react-icons/bs';

// Ikon kustom untuk titik jemput
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Ikon kustom untuk sekolah
const schoolIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Komponen Peta untuk Supir (sudah diperbaiki dan ditingkatkan)
function DriverMap({ route, pickupList, targetSchools, initialPosition }) {
  // ... (no changes in this component)
  const driverMarkerRef = useRef(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isAutoCentering, setIsAutoCentering] = useState(true);
  const map = useMap();

  // Efek animasi pergerakan supir
  useEffect(() => {
    if (route.length <= 1) return;

    let animationFrameId;
    const totalDuration = route.length * 100; // Kecepatan animasi
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = elapsedTime / totalDuration;

      if (progress >= 1) {
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng(route[route.length - 1]);
        }
        return;
      }

      const pointIndex = Math.floor(progress * (route.length - 1));
      const startPoint = route[pointIndex];
      const endPoint = route[pointIndex + 1] || startPoint;
      
      // Pengecekan yang lebih ketat: pastikan startPoint dan endPoint tidak null dan merupakan array yang valid
      if (!startPoint || !endPoint || !Array.isArray(startPoint) || !Array.isArray(endPoint)) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const segmentProgress = (progress * (route.length - 1)) - pointIndex;
      const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress;
      const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress;
      const newPosition = [lat, lng];
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(newPosition);
      }

      const bearing = Math.atan2(endPoint[1] - startPoint[1], endPoint[0] - startPoint[0]) * 180 / Math.PI;
      setRotationAngle(bearing);

      if (isAutoCentering) {
        map.panTo(newPosition);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [route, isAutoCentering, map]);

  // Ikon kendaraan yang bisa berputar (metode stabil)
  const vehicleIconWithRotation = L.divIcon({
    html: `<div style="transform: rotate(${rotationAngle}deg); transform-origin: center;">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" stroke-width="1.5" stroke="#28a745" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="6.5" cy="13.5" r="1.5" /><circle cx="17.5" cy="13.5" r="1.5" /><path d="M5.08 6h13.84a1 1 0 0 1 .8.4l1.2 2.4a1 1 0 0 1 0 1.2l-1.2 2.4a1 1 0 0 1 -.8.4h-13.84a1 1 0 0 1 -.8-.4l-1.2-2.4a1 1 0 0 1 0-1.2l1.2-2.4a1 1 0 0 1 .8-.4z" /><path d="M3 12v-6.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v6.5" /></svg>
           </div>`,
    className: 'vehicle-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  // Inisialisasi dan update marker supir
  useEffect(() => {
    if (!driverMarkerRef.current && initialPosition) {
      driverMarkerRef.current = L.marker(initialPosition, { icon: vehicleIconWithRotation }).addTo(map);
      driverMarkerRef.current.bindPopup("Posisi Anda");
    }

    const handleLocationUpdate = (data) => {
      if (driverMarkerRef.current) {
        const newPos = [data.location.lat, data.location.lng];
        driverMarkerRef.current.setLatLng(newPos);
        if (isAutoCentering) {
          map.panTo(newPos);
        }
      }
    };

    socket.on('locationUpdated', handleLocationUpdate);
    return () => socket.off('locationUpdated', handleLocationUpdate);
  }, [initialPosition, map, vehicleIconWithRotation, isAutoCentering]);
  return (
    <>
      <Button variant={isAutoCentering ? "primary" : "secondary"} size="sm" style={{ position: 'absolute', top: 10, left: 50, zIndex: 1000 }} onClick={() => setIsAutoCentering(!isAutoCentering)}>
        {isAutoCentering ? "Auto-Center: ON" : "Auto-Center: OFF"}
      </Button>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <Polyline pathOptions={{ color: 'green', weight: 6 }} positions={route} />
      {pickupList.map(item => (
        // Perbaikan: Pastikan lokasi adalah array [lat, lng] yang valid
        item.location?.coordinates &&
        <Marker key={item._id} position={[item.location.coordinates[1], item.location.coordinates[0]]} icon={pickupIcon}><Popup>Jemput: <strong>{item.name}</strong><br/>{item.address}</Popup></Marker>
      ))}
      {targetSchools.map(school => (
        <Marker key={`school-${school._id}`} position={[school.location.coordinates[1], school.location.coordinates[0]]} icon={schoolIcon}><Popup>Tujuan: <strong>{school.name}</strong></Popup></Marker>
      ))}
    </>
  );
}

function EmergencyModal({ show, onHide, onSend, tripType }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.warn("Pesan tidak boleh kosong.");
      return;
    }
    setIsSending(true);
    await onSend(message);
    setIsSending(false);
    setMessage('');
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Kirim Info Darurat</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted small">Pesan ini akan dikirim sebagai notifikasi push ke semua wali murid dari siswa yang sedang dalam perjalanan ({tripType === 'pickup' ? 'penjemputan' : 'pengantaran'}).</p>
        <Form.Group>
          <Form.Label>Pesan Darurat</Form.Label>
          <Form.Control as="textarea" rows={3} placeholder="Contoh: Sedang macet parah di Jl. Mawar, akan ada keterlambatan." value={message} onChange={(e) => setMessage(e.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Batal</Button>
        <Button variant="danger" onClick={handleSend} disabled={isSending}>
          {isSending ? <Spinner as="span" size="sm" /> : 'Kirim Notifikasi'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function DriverNav() {
  // State untuk lokasi real-time sekarang dikelola di dalam DriverNav
  // Ini akan di-update oleh socket listener
  const [realtimeLocation, setRealtimeLocation] = useState(null);
  const [tripType, setTripType] = useState('pickup'); // 'pickup' atau 'dropoff'

  // State untuk data inti
  const [loggedInDriver, setLoggedInDriver] = useState(null);
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [roadPath, setRoadPath] = useState([]);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState(null);
  const isFetching = useRef(false);
  const fetchedRoutes = useRef(new Map()); // Cache untuk rute yang sudah di-fetch
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      console.log('[DEBUG] 1. Memulai fetchInitialData...');
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Sesi tidak valid.");
        const user = JSON.parse(atob(token.split('.')[1])).user;
        if (user.role !== 'driver' || !user.profileId) throw new Error("Akses ditolak.");

        const [driverRes, studentsRes, schoolsRes] = await Promise.all([
          api.get(`/drivers/${user.profileId}`),
          api.get('/students'),
          api.get('/schools')
        ]);

        const currentDriver = driverRes.data;
        if (!currentDriver) throw new Error("Tidak ada data supir di database.");
        console.log('[DEBUG] 2. Data awal berhasil diambil. Driver ID:', currentDriver._id);

        setLoggedInDriver(currentDriver);
        setStudents(studentsRes.data);
        setSchools(schoolsRes.data);
      } catch (error) {
        console.error('[DEBUG] Gagal dalam fetchInitialData:', error);
        setRouteError("Gagal memuat data awal untuk navigasi.");
        console.error(error);
      }
    };
    fetchInitialData();
  }, []);

  // Pisahkan listener socket ke dalam useEffect-nya sendiri
  // Ini tidak akan memicu perhitungan rute ulang
  useEffect(() => {
    const handleLocationUpdate = (data) => {
      // Hanya update jika lokasi dari supir yang sedang "login"
      console.log('[DEBUG] Menerima locationUpdated dari socket. Driver ID:', data.driverId);
      if (loggedInDriver && data.driverId === loggedInDriver._id) {
        setRealtimeLocation(data.location);
      }
    };
    socket.on('locationUpdated', handleLocationUpdate);
    return () => {
      socket.off('locationUpdated', handleLocationUpdate);
    };
  }, [loggedInDriver]); // Hanya bergantung pada loggedInDriver

  // Menggunakan logika filter yang sudah diperbarui sesuai model data Student.js dan diurutkan
  const studentList = useMemo(() => {
    if (!loggedInDriver || !students) return [];
    if (tripType === 'pickup') {
      return students.filter(student =>
        student.zone === loggedInDriver.zone &&
        student.generalStatus === 'Active' &&
        student.service?.pickup === true
      ).sort((a, b) => a.name.localeCompare(b.name));
    } else { // tripType === 'dropoff'
      return students.filter(student =>
        student.zone === loggedInDriver.zone &&
        student.generalStatus === 'Active' &&
        student.service?.dropoff === true
      ).sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [students, loggedInDriver, tripType]);

  const initialPosition = useMemo(() => {
    // initialPosition SEKARANG HANYA untuk titik awal rute, bukan posisi real-time.
    // Ini membuatnya stabil dan tidak berubah-ubah.
    console.log('[DEBUG] Menghitung initialPosition untuk rute...');
    const garageCoords = loggedInDriver?.location?.coordinates;
    if (garageCoords && (garageCoords[0] !== 0 || garageCoords[1] !== 0)) {
      return [garageCoords[1], garageCoords[0]]; // [lat, lng]
    }
    // Jika tidak ada sama sekali, gunakan lokasi default
    return [-7.2575, 112.7521]; // Fallback ke lokasi default (Surabaya)
  }, [loggedInDriver]); // Hapus realtimeLocation dari dependensi

  // Dapatkan semua sekolah tujuan yang unik dari daftar jemputan
  const targetSchools = useMemo(() => {
    // Ambil semua ID sekolah yang unik dari daftar jemputan
    const uniqueSchoolIds = [...new Set(studentList.map(student => student.school?._id).filter(Boolean))];
    // Cari objek sekolah lengkap dari state 'schools' berdasarkan ID yang unik
    return schools.filter(school => uniqueSchoolIds.includes(school._id));
  }, [studentList, schools]);

  const waypoints = useMemo(() => {
    console.log('[DEBUG] Menghitung ulang waypoints...');
    // Gunakan realtimeLocation sebagai titik awal JIKA ADA, jika tidak, gunakan initialPosition.
    // Ini memastikan rute dihitung dari posisi supir saat ini, tanpa membuat loop.
    const startPoint = realtimeLocation 
      ? [realtimeLocation.lat, realtimeLocation.lng] 
      : initialPosition;
    if (!startPoint) return [];
    
    // Filter siswa berdasarkan status yang relevan dengan jenis trip
    const pendingStudents = (tripType === 'pickup')
      ? studentList.filter(s => s.tripStatus === 'at_home')
      : studentList.filter(s => s.tripStatus === 'at_school');
    
    // Filter out any points that are null or don't have valid coordinates
    const studentPoints = pendingStudents
      .map(student => {
        const coords = student.location?.coordinates;
        // Pastikan koordinat ada, valid, dan bukan titik default [0,0]
        if (coords && coords.length === 2 && (coords[0] !== 0 || coords[1] !== 0)) {
          return [coords[1], coords[0]]; // [lat, lng]
        }
        return null;
      })
      .filter(Boolean);

    const schoolPoints = targetSchools
      // Filter lokasi sekolah yang tidak valid atau default
      .map(school => school.location?.coordinates && school.location.coordinates.length === 2 && (school.location.coordinates[0] !== 0 || school.location.coordinates[1] !== 0) ? [school.location.coordinates[1], school.location.coordinates[0]] : null)
      .filter(Boolean);

    // Susun urutan rute berdasarkan jenis trip
    const points = (tripType === 'pickup')
      ? [startPoint, ...studentPoints, ...schoolPoints]
      : [startPoint, ...schoolPoints, ...studentPoints];

    return points;
  }, [initialPosition, studentList, targetSchools, realtimeLocation, tripType]);

  const waypointsKey = useMemo(() => JSON.stringify(waypoints), [waypoints]);

  // Efek untuk fetch rute secara otomatis saat waypoints berubah
  useEffect(() => {
    // Jangan lakukan apa-apa jika data inti belum siap
    if (!loggedInDriver || students.length === 0) {
      console.log('[DEBUG] Menunggu data inti (supir/siswa) sebelum menghitung rute.');
      return;
    }

    const fetchRoute = async () => {
      console.log('[DEBUG] 3. Memulai fetchRoute...');
      if (!initialPosition || waypoints.length < 2) {
        console.log('[DEBUG] Tidak cukup titik, membatalkan fetch rute.');
        setRouteError("Tidak ada cukup titik untuk menghitung rute.");
        return;
      }

      if (fetchedRoutes.current.has(waypointsKey)) {
        setRoadPath(fetchedRoutes.current.get(waypointsKey));
        console.log('[DEBUG] Rute dimuat dari cache.');
        return;
      }

      if (isFetching.current) return;
      isFetching.current = true;
      setIsRouteLoading(true);
      setRouteError(null);

      try {
        console.log('[DEBUG] 4. Mengirim permintaan ke /api/route dengan waypoints:', waypoints);
        const response = await api.post('/route', { waypoints });
        const newPath = response.data.paths[0].points.coordinates.map(p => [p[1], p[0]]);
        setRoadPath(newPath);
        fetchedRoutes.current.set(waypointsKey, newPath);
      } catch (error) {
        console.error('[DEBUG] Gagal mengambil rute:', error);
        const errorMessage = error.response?.data?.message || "Gagal mengambil rute.";
        setRouteError(errorMessage);
      } finally {
        setIsRouteLoading(false);
        isFetching.current = false;
      }
    };
    fetchRoute();
  }, [waypointsKey, loggedInDriver, students, initialPosition, waypoints]); // Dependensi yang lengkap dan eksplisit

  const handleSendEmergency = async (message) => {
    if (!loggedInDriver) {
      toast.error("Tidak bisa mengirim, data supir tidak ditemukan.");
      return;
    }
    try {
      const res = await api.post('/notifications/emergency', {
        driverId: loggedInDriver._id,
        message,
        tripType
      });
      toast.success(res.data.msg || "Notifikasi darurat berhasil dikirim.");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Gagal mengirim notifikasi darurat.");
    }
  };

  return (
    <Row>
      <Col md={8}>
        <Card className="h-100 shadow-sm">
          <Card.Body style={{ height: '80vh', padding: '0', position: 'relative' }}>
            {isRouteLoading && (
              <div className="d-flex justify-content-center align-items-center h-100" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1001}}>
                <Spinner animation="border" role="status" className="me-2"/>
                <span>Menghitung rute terbaik...</span>
              </div>
            )}
            {routeError && !isRouteLoading && <Alert variant="danger" className="m-3 position-absolute" style={{top: 0, left: 0, zIndex: 1001}}><strong>Error:</strong> {routeError}</Alert>}
            {initialPosition && !routeError ? (
              <MapContainer center={initialPosition} zoom={14} style={{ height: '100%', width: '100%' }}>
                <DriverMap 
                  route={roadPath}
                  pickupList={studentList.filter(s => s.tripStatus === 'at_home')} // Hanya kirim yang relevan
                  targetSchools={targetSchools}
                  initialPosition={initialPosition}
                />
              </MapContainer>
            ) : (
              !isRouteLoading && (
                <div className="d-flex justify-content-center align-items-center h-100 text-center p-3">
                  <p className="text-muted">{!loggedInDriver ? "Gagal memuat data supir. Pastikan server backend berjalan." : (studentList.length === 0 ? "Tidak ada siswa yang perlu dijemput untuk trip ini." : "Lokasi garasi supir tidak ditemukan.")}</p>
                </div>
              )
            )}
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card style={{ height: '80vh' }} className="shadow-sm">
          <Nav variant="tabs" activeKey={tripType} onSelect={(k) => setTripType(k)} className="mb-0">
            <Nav.Item>
              <Nav.Link eventKey="pickup">Jemput</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="dropoff">Antar</Nav.Link>
            </Nav.Item>
          </Nav>
          <ListGroup variant="flush" style={{ overflowY: 'auto' }}>
            <ListGroup.Item className="text-center">
              <Button variant="outline-danger" size="sm" onClick={() => setShowEmergencyModal(true)}>
                Kirim Info Darurat
              </Button>
            </ListGroup.Item>
            {tripType === 'pickup' && (
              <>
                {studentList.filter(s => s.tripStatus === 'at_home').map((item, index) => (
                  <ListGroup.Item key={item._id} className="d-flex align-items-start">
                    <div className="fw-bold me-3">{index + 1}</div>
                    <BsPerson className="me-3 mt-1 text-primary" size={20} />
                    <div className="me-auto">
                      <div className="fw-bold">{item.name}</div>
                      <small className="text-muted">{item.address}</small>
                    </div>
                  </ListGroup.Item>
                ))}
                {targetSchools.map((school, index) => (
                  <ListGroup.Item key={school._id} className="d-flex align-items-start bg-light-subtle">
                    <div className="fw-bold me-3">{studentList.filter(s => s.tripStatus === 'at_home').length + index + 1}</div>
                    <BsFlagFill className="me-3 mt-1 text-danger" size={20} />
                    <div className="me-auto">
                      <div className="fw-bold">Tujuan: {school.name}</div>
                      <small className="text-muted">Lokasi Sekolah</small>
                    </div>
                  </ListGroup.Item>
                ))}
              </>
            )}
            {tripType === 'dropoff' && (
               studentList.filter(s => s.tripStatus === 'at_school').map((item, index) => (
                <ListGroup.Item key={item._id} className="d-flex align-items-start">
                  <div className="fw-bold me-3">{index + 1}</div>
                  <BsPerson className="me-3 mt-1 text-info" size={20} />
                  <div className="me-auto">
                    <div className="fw-bold">{item.name}</div>
                    <small className="text-muted">{item.address}</small>
                  </div>
                </ListGroup.Item>
              ))
            )}
            {studentList.filter(s => s.tripStatus === 'picked_up' || s.tripStatus === 'dropped_off').map((item) => (
              <ListGroup.Item key={item._id} className="d-flex align-items-start text-muted bg-light">
                <BsCheckCircleFill className="me-3 mt-1 text-success" size={20} />
                <div className="me-auto text-decoration-line-through">
                  <div className="fw-bold">{item.name}</div>
                  <small>{item.tripStatus === 'picked_up' ? 'Sudah dijemput' : 'Tiba di sekolah'}</small>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      </Col>
      <EmergencyModal 
        show={showEmergencyModal}
        onHide={() => setShowEmergencyModal(false)}
        onSend={handleSendEmergency}
        tripType={tripType}
      />
    </Row>
  );
}

export default DriverNav;
