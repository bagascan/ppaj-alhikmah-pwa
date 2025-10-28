import React, { useState, useEffect, useRef } from 'react';
import api from '../../api'; // Gunakan instance api yang sudah memiliki interceptor
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { Card, Spinner, Alert } from 'react-bootstrap';
import L from 'leaflet';
import pusher from '../../pusher';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';

// Ikon default untuk supir
const vehicleIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" stroke-width="1.5" stroke="#dc3545" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="6.5" cy="13.5" r="1.5" /><circle cx="17.5" cy="13.5" r="1.5" /><path d="M5.08 6h13.84a1 1 0 0 1 .8.4l1.2 2.4a1 1 0 0 1 0 1.2l-1.2 2.4a1 1 0 0 1 -.8.4h-13.84a1 1 0 0 1 -.8-.4l-1.2-2.4a1 1 0 0 1 0-1.2l1.2-2.4a1 1 0 0 1 .8-.4z" /><path d="M3 12v-6.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v6.5" /></svg>`,
  className: 'vehicle-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Palet warna untuk zona
const colorPalette = ['#1f78b4', '#33a02c', '#e31a1c', '#ff7f00', '#6a3d9a', '#b15928'];

function FleetMonitor() {
  const fallbackPosition = [-7.2575, 112.7521]; // Posisi default Surabaya
  const [drivers, setDrivers] = useState([]);
  const [driverLocations, setDriverLocations] = useState({});
  const [zones, setZones] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const hasCenteredMapRef = useRef(false);
  const { auth, loading: authLoading } = useAuth();

  // Ambil data zona dan supir dari API
  useEffect(() => {
    const fetchInitialData = async () => {
      if (authLoading) {
        return; // "Penjaga" untuk mencegah fetch sebelum login
      }
      if (!auth) {
        setDataLoading(false);
        return;
      }

      try {
        const [zonesRes, driversRes] = await Promise.all([
          api.get('/zones'),
          api.get('/drivers')
        ]);
        setZones(zonesRes.data);
        setDrivers(driversRes.data);
      } catch (err) {
        setError("Gagal memuat data awal.");
        toast.error("Gagal memuat data awal.");
      } finally {
        setDataLoading(false);
      }
    };
    fetchInitialData();
  }, [auth, authLoading]);

  // Effect untuk mengelola listener socket
  useEffect(() => {
    // Subscribe ke channel publik untuk update lokasi
    const channel = pusher.subscribe('tracking-channel');

    // Bind ke event 'location-update'
    channel.bind('location-update', (data) => {
        setDriverLocations(prevLocations => ({
            ...prevLocations,
            [data.driverId]: data.location
        }));
        if (mapRef.current && !hasCenteredMapRef.current) {
            mapRef.current.flyTo([data.location.lat, data.location.lng], 14);
            hasCenteredMapRef.current = true;
        }
    });

    return () => {
      pusher.unsubscribe('tracking-channel');
    };
  }, []);

  // Fungsi untuk memberikan style pada poligon zona
  const styleZone = (index) => {
    const color = colorPalette[index % colorPalette.length];
    return { color, weight: 2, fillColor: color, fillOpacity: 0.2 };
  };

  // Fungsi untuk mengikat popup ke setiap poligon zona
  const onEachZone = (feature, layer) => {
    // Pastikan feature dan properties ada
    if (feature.properties && feature.properties.name) {
      layer.bindPopup(`<b>Zona: ${feature.properties.name}</b>`);
    }
  };

  if (authLoading || dataLoading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <Card>
      <Card.Header as="h5">Pantauan Armada</Card.Header>
      <Card.Body style={{ height: '75vh', padding: '0' }}>
        <MapContainer
          center={fallbackPosition}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Menampilkan Poligon Zona */}
          {zones.map((zone, index) => {
            return zone.geojson && (
              <GeoJSON 
                key={zone._id} 
                data={zone.geojson} 
                style={() => styleZone(index)}
                onEachFeature={onEachZone} />
            );
          })}

          {/* Menampilkan Marker Supir */}
          {drivers.map(driver => {
            const location = driverLocations[driver._id];
            let position;
            let popupMessage;

            if (location) {
              position = [location.lat, location.lng];
              popupMessage = `Supir: <strong>${driver.name}</strong><br/>Zona: ${driver.zone}`;
            } else if (driver.location?.coordinates && (driver.location.coordinates[0] !== 0 || driver.location.coordinates[1] !== 0)) {
              position = [driver.location.coordinates[1], driver.location.coordinates[0]];
              popupMessage = `Supir: <strong>${driver.name}</strong><br/>Zona: ${driver.zone}<br/><em>Posisi di garasi (lokasi belum aktif)</em>`;
            } else {
              return null;
            }

            return (
              <Marker key={driver._id} position={position} icon={vehicleIcon} opacity={location ? 1.0 : 0.5}>
                <Popup><div dangerouslySetInnerHTML={{ __html: popupMessage }} /></Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Card.Body>
    </Card>
  );
}

export default FleetMonitor;