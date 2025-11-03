import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, LayersControl } from 'react-leaflet';
import { Card, Spinner, Alert } from 'react-bootstrap';
import L from 'leaflet';
import api from '../../api';
import pusher from '../../pusher';
import { toast } from 'react-toastify';

// Ikon untuk shuttle
const vehicleIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" stroke-width="1.5" stroke="#007bff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="6.5" cy="13.5" r="1.5" /><circle cx="17.5" cy="13.5" r="1.5" /><path d="M5.08 6h13.84a1 1 0 0 1 .8.4l1.2 2.4a1 1 0 0 1 0 1.2l-1.2 2.4a1 1 0 0 1 -.8.4h-13.84a1 1 0 0 1 -.8-.4l-1.2-2.4a1 1 0 0 1 0-1.2l1.2-2.4a1 1 0 0 1 .8-.4z" /><path d="M3 12v-6.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v6.5" /></svg>`,
  className: 'vehicle-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Komponen Marker Supir yang bisa diupdate secara mandiri
function DriverMarker({ driver, map, realtimeLocation }) {
  const markerRef = useRef(null);

  // Inisialisasi marker saat pertama kali render
  useEffect(() => {
    if (!markerRef.current && driver.location?.coordinates && (driver.location.coordinates[0] !== 0 || driver.location.coordinates[1] !== 0)) {
      const initialPos = [driver.location.coordinates[1], driver.location.coordinates[0]];
      markerRef.current = L.marker(initialPos, { icon: vehicleIcon }).addTo(map);
      markerRef.current.bindTooltip(`Supir: <strong>${driver.name}</strong><br />Zona: ${driver.zone}<br /><em>Posisi di garasi</em>`);
    }
  }, [driver, map]);

  // Efek untuk mengupdate posisi marker
  useEffect(() => {
    if (realtimeLocation && markerRef.current) {
      const newPos = [realtimeLocation.lat, realtimeLocation.lng];
      markerRef.current.setLatLng(newPos);
      markerRef.current.setTooltipContent(`Supir: <strong>${driver.name}</strong><br />Zona: ${driver.zone}`);
    }
  }, [realtimeLocation, driver.name, driver.zone]);

  return null;
}

// Komponen untuk me-render semua marker supir
function DriverMarkers({ drivers, driverLocations }) {
  const map = useMap();
  return (
    <>
      {drivers.map((driver) => (
        <DriverMarker 
          key={driver._id} 
          driver={driver} 
          realtimeLocation={driverLocations[driver._id]}
          map={map} 
        />
      ))}
    </>
  );
}

function FleetMonitor() {
  const [drivers, setDrivers] = useState([]);
  const [driverLocations, setDriverLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const surabayaPosition = [-7.2575, 112.7521]; // Fallback position

  // 1. Fetch data supir awal
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await api.get('/drivers');
        setDrivers(res.data);
      } catch (err) {
        setError("Gagal memuat data supir.");
        toast.error("Gagal memuat data supir.");
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  // 2. Subscribe ke Pusher untuk update lokasi
  useEffect(() => {
    const channel = pusher.subscribe('tracking-channel');
    channel.bind('location-update', (data) => {
      setDriverLocations(prevLocations => ({
        ...prevLocations,
        [data.driverId]: data.location
      }));
    });

    return () => {
      pusher.unsubscribe('tracking-channel');
    };
  }, []);

  if (loading) {
    return <div className="text-center mt-5"><Spinner animation="border" /> <p>Memuat data armada...</p></div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Card>
      <Card.Header as="h2">Monitor Armada</Card.Header>
      <Card.Body style={{ height: '80vh', padding: '0' }}>
        <MapContainer center={surabayaPosition} zoom={12} style={{ height: '100%', width: '100%' }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Peta Jalan">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Peta Satelit">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          <DriverMarkers drivers={drivers} driverLocations={driverLocations} />
        </MapContainer>
      </Card.Body>
      <Card.Footer className="text-muted">
        Posisi supir akan diperbarui secara otomatis.
      </Card.Footer>
    </Card>
  );
}

export default FleetMonitor;
