import React, { useState, useEffect, useRef } from 'react';
import api from '../../api'; // Ganti axios dengan api
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
// Import CSS untuk leaflet dan leaflet-draw
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Palet warna untuk zona baru
const colorPalette = ['#1f78b4', '#33a02c', '#e31a1c', '#ff7f00', '#6a3d9a', '#b15928'];

function ZoneEditor() {
  const surabayaPosition = [-7.2575, 112.7521]; // Center of Surabaya
  const [zones, setZones] = useState([]);
  const featureGroupRef = useRef();

  useEffect(() => {
    const fetchZones = async () => {
      // Tambahkan "penjaga" untuk memeriksa token
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      try {
        const res = await api.get('/zones'); // Gunakan api
        setZones(res.data);
      } catch (err) {
        toast.error("Gagal memuat data zona.");
        console.error(err);
      }
    };
    fetchZones();
  }, []);

  const handleCreated = async (e) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const zoneName = window.prompt("Masukkan nama untuk zona baru:", `Zona ${zones.length + 1}`);
      if (!zoneName) {
        return;
      } 

      const geojson = layer.toGeoJSON();

      try {
        // Kirim 'name' dan 'geometry' ke backend
        const res = await api.post('/zones', { name: zoneName, geojson });
        setZones((currentZones) => [...currentZones, res.data]);
        toast.success(`Zona "${zoneName}" berhasil dibuat!`);

      } catch (err) {
        console.error(err);
        toast.error('Something went wrong!');
      }
    }
  };

  const handleEdited = async (e) => {
    const { layers } = e;
    layers.eachLayer(async (layer) => {
      // Temukan ID zone dari layer yang diedit
      const zone = zones.find(z => z._id === layer.feature.properties.id);
      if (zone) {
        try {
          const geojson = layer.toGeoJSON();
          await api.put(`/zones/${zone._id}`, { geojson });
          toast.success(`Zona "${zone.name}" berhasil diperbarui!`);
        } catch (err) {
          console.error(err);
          toast.error('Something went wrong!');
        }
      }
    });
  };

  const handleDeleted = async (e) => {
    const { layers } = e;
    layers.eachLayer(async (layer) => {
      const zone = zones.find(z => z._id === layer.feature.properties.id);
      if (zone) {
        try {
          await api.delete(`/zones/${zone._id}`);
          toast.success('Zone deleted successfully!');
        } catch (err) {
          console.error(err);
          toast.error('Something went wrong!');
        }
      }
    });
    // Hapus layer dari state secara lokal untuk update UI instan
    const deletedIds = Object.values(e.layers._layers).map(l => l.feature.properties.id);
    setZones(currentZones => currentZones.filter(z => !deletedIds.includes(z._id)));
  };



  // Fungsi untuk memberikan style pada setiap layer GeoJSON
  const styleGeoJSON = (index) => {
    const color = colorPalette[index % colorPalette.length];
    return { color: color, weight: 2, fillColor: color, fillOpacity: 0.3 };
  };

  // Fungsi untuk mengikat popup ke setiap layer
  const onEachFeature = (feature, layer) => {
    // Pastikan feature dan properties ada sebelum diakses
    if (!feature || !feature.properties) {
      feature = { properties: {} };
    }
    // Ambil nama dari feature.properties yang akan kita set di bawah
    const zoneName = feature.properties.name || 'Zona';
    layer.bindPopup(`<b>${zoneName}</b>`);
    // Simpan ID dari database ke dalam layer untuk referensi saat edit/hapus
    layer.feature.properties.id = feature.properties.id;
  };

  return (
    <Card>
      <Card.Header as="h5">Editor Zona</Card.Header>
      <Card.Body style={{ height: '70vh', padding: '0' }}>
        <MapContainer center={surabayaPosition} zoom={12} style={{ height: '100%', width: '100%' }}>
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
              onCreated={handleCreated}
              onEdited={handleEdited}
              onDeleted={handleDeleted}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
            />
            {zones.map((zone, index) => {
              return zone.geojson && (
                <GeoJSON 
                  key={zone._id} 
                  data={zone.geojson}
                  style={() => styleGeoJSON(index)} 
                  onEachFeature={onEachFeature} />
              );
            })}
          </FeatureGroup>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
        </MapContainer>
      </Card.Body>
    </Card>
  );
}

export default ZoneEditor;