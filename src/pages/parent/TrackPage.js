import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../api';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Card, Spinner, Alert, Button } from 'react-bootstrap';
import L from 'leaflet';
import pusher from '../../pusher';
import { useAuth } from '../../hooks/useAuth';

// Ikon untuk shuttle
const vehicleIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" stroke-width="1.5" stroke="#dc3545" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="6.5" cy="13.5" r="1.5" /><circle cx="17.5" cy="13.5" r="1.5" /><path d="M5.08 6h13.84a1 1 0 0 1 .8.4l1.2 2.4a1 1 0 0 1 0 1.2l-1.2 2.4a1 1 0 0 1 -.8.4h-13.84a1 1 0 0 1 -.8-.4l-1.2-2.4a1 1 0 0 1 0-1.2l1.2-2.4a1 1 0 0 1 .8-.4z" /><path d="M3 12v-6.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v6.5" /></svg>`,
  className: 'vehicle-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Komponen Marker Supir yang bisa diupdate secara mandiri
function DriverMarker({ driver, map, isAutoCentering, isFirstDriver, realtimeLocation }) {
  const markerRef = useRef(null);

  // Inisialisasi marker saat pertama kali render
  useEffect(() => {
    if (!markerRef.current && driver.location?.coordinates) {
      const initialPos = [driver.location.coordinates[1], driver.location.coordinates[0]];
      markerRef.current = L.marker(initialPos, { icon: vehicleIcon }).addTo(map);
      markerRef.current.bindTooltip(`Supir: <strong>${driver.name || 'N/A'}</strong><br />Kendaraan: ${driver.vehicle || 'N/A'}<br /><em>Posisi di garasi (lokasi belum aktif)</em>`);
    }
  }, [driver, map, driver.name, driver.vehicle]);

  // Efek ini sekarang hanya untuk mengupdate posisi marker, bukan untuk subscribe
  useEffect(() => {
    if (realtimeLocation && markerRef.current) {
      const newPos = [realtimeLocation.lat, realtimeLocation.lng];
      markerRef.current.setLatLng(newPos);
      if (isAutoCentering && isFirstDriver) {
        map.panTo(newPos);
      }
      markerRef.current.setTooltipContent(`Supir: <strong>${driver.name || 'N/A'}</strong><br />Kendaraan: ${driver.vehicle || 'N/A'}`);
    }
  }, [realtimeLocation, driver.name, driver.vehicle, map, isAutoCentering, isFirstDriver]);

  return null; // Komponen ini tidak merender elemen DOM secara langsung
}

// Pindahkan DriverMarkers ke luar dan bungkus dengan React.memo
const DriverMarkers = React.memo(({ drivers, driverLocations, isAutoCentering }) => {
  const map = useMap();
  return (
    <>
      {drivers.map((driver, index) => (
        <DriverMarker 
          key={driver._id} 
          driver={driver} 
          realtimeLocation={driverLocations[driver._id]}
          map={map} 
          isAutoCentering={isAutoCentering}
          isFirstDriver={index === 0}
        />
      ))}
    </>
  );
});


// Komponen untuk mengontrol peta
function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function TrackPage() {
  const [mapCenter, setMapCenter] = useState(null); // Hanya untuk mengatur pusat peta awal
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]); // State untuk banyak supir
  const [error, setError] = useState(null);
  const [driverLocations, setDriverLocations] = useState({}); // State terpusat untuk lokasi
  const [isAutoCentering, setIsAutoCentering] = useState(true);
  const { auth, loading: authLoading } = useAuth();

  // Effect untuk subscribe ke Pusher (HANYA SEKALI)
  useEffect(() => {
    const channel = pusher.subscribe('tracking-channel');

    channel.bind('location-update', (data) => {
      setDriverLocations(prevLocations => ({
        ...prevLocations,
        [data.driverId]: data.location
      }));
    });

    // Cleanup saat komponen di-unmount
    return () => {
      pusher.unsubscribe('tracking-channel');
    };
  }, []); // Dependency array kosong agar hanya berjalan sekali

  // Effect 1: Fetch initial data to find the relevant driver
  useEffect(() => {
    const fetchInitialData = async () => {
      if (authLoading) {
        return;
      }
      if (!auth || auth.user.role !== 'parent') {
        setLoading(false);
        setError("Sesi tidak valid atau Anda bukan wali murid.");
        return;
      }
      try {
        // Panggil endpoint baru yang lebih efisien dan aman
        const res = await api.get('/students/for-parent-tracking');
        
        // Data sudah difilter dari backend
        const { myStudents, relevantDrivers } = res.data;

        // Pengecekan jika tidak ada siswa atau supir yang relevan
        if (!myStudents || myStudents.length === 0) {
          throw new Error("Siswa untuk wali murid ini tidak ditemukan.");
        }
        if (relevantDrivers.length === 0) {
          throw new Error("Tidak ada supir yang ditemukan untuk zona anak Anda.");
        }
        
        setDrivers(relevantDrivers); // Simpan semua supir yang relevan

        // Atur posisi awal peta ke lokasi garasi supir pertama
        const firstDriverWithLocation = relevantDrivers.find(d => d.location?.coordinates && (d.location.coordinates[0] !== 0 || d.location.coordinates[1] !== 0));
        if (firstDriverWithLocation) {
          setMapCenter([ // Hanya untuk pusat peta awal. Format: [latitude, longitude]
            firstDriverWithLocation.location.coordinates[1],
            firstDriverWithLocation.location.coordinates[0]
          ]);
        }

      } catch (err) {
        setError("Gagal memuat data pelacakan: " + (err.response?.data?.msg || err.message));
        toast.error("Gagal memuat lokasi.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [auth, authLoading]); // Jalankan ulang jika auth berubah

  if (loading || authLoading) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat lokasi...</p></div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!mapCenter) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Menunggu sinyal lokasi dari supir...</p></div>;
  }

  return (
    <Card>
      <Card.Header as="h5">Lacak Lokasi Shuttle</Card.Header>
      <Card.Body style={{ height: '75vh', padding: '0' }}>
        <MapContainer 
          center={mapCenter} 
          zoom={15}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController center={mapCenter} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <DriverMarkers 
            drivers={drivers} 
            driverLocations={driverLocations} 
            isAutoCentering={isAutoCentering} 
          />
          <Button variant={isAutoCentering ? "primary" : "secondary"} size="sm" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }} onClick={() => setIsAutoCentering(!isAutoCentering)}>
            {isAutoCentering ? "Auto-Center: ON" : "Auto-Center: OFF"}
          </Button>
        </MapContainer>
      </Card.Body>
    </Card>
  );
}

export default TrackPage;