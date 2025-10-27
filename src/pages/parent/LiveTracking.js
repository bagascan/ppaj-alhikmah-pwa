import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Card, Alert } from 'react-bootstrap';
import { BsGeoAltFill } from 'react-icons/bs';
import AnimatedMarker from '../../components/AnimatedMarker';

// Custom-colored marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LiveTracking() {
  // Fallback to a default position if the route is empty to prevent crash
  const initialPosition = dummyRoute.length > 0 ? [dummyRoute[0].lat, dummyRoute[0].lng] : [-7.2575, 112.7521];

  const [routeIndex, setRouteIndex] = useState(0);
  const [driverPosition, setDriverPosition] = useState(initialPosition);  
  const [rotationAngle, setRotationAngle] = useState(0);
  const [eta, setEta] = useState(dummyRoute.length * 3 / 60); // Initial ETA in minutes
  const parentLocation = [-7.265, 112.76]; // Dummy parent location

  useEffect(() => {
    if (dummyRoute.length === 0) return; // Do not start simulation if route is empty
    // Simulate driver movement every 3 seconds
    const interval = setInterval(() => {
      setRouteIndex(prevIndex => {        
        const currentPoint = dummyRoute[prevIndex];
        const nextIndex = (prevIndex + 1) % dummyRoute.length;
        const nextPoint = dummyRoute[nextIndex];

        // Calculate bearing/rotation
        const lat1 = currentPoint.lat * Math.PI / 180;
        const lon1 = currentPoint.lng * Math.PI / 180;
        const lat2 = nextPoint.lat * Math.PI / 180;
        const lon2 = nextPoint.lng * Math.PI / 180;

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        
        // Only update rotation if there is a change in position
        if (currentPoint.lat !== nextPoint.lat || currentPoint.lng !== nextPoint.lng) {
          setRotationAngle(bearing);
        }

        setDriverPosition([nextPoint.lat, nextPoint.lng]);
        
        // Update ETA: calculate remaining stops * time per stop
        const remainingStops = dummyRoute.length - (nextIndex + 1);
        setEta(Math.ceil(remainingStops * 3 / 60)); // in minutes
        return nextIndex;
      });
    }, 3000);

    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const routeCoordinates = dummyRoute.map(p => [p.lat, p.lng]);
  
  // Custom vehicle icon that can be rotated
  const vehicleIcon = new L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-car"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 17l-2 -2v-6l2 -2h10l2 2v6l-2 2h-10z" /><path d="M11 9l4 0" /><path d="M17 17l0 -2" /><path d="M7 17l0 -2" /><path d="M5 12l0 -2" /><path d="M19 12l0 -2" /><path d="M7 15l-2 0" /><path d="M19 15l-2 0" /><path d="M10 17l4 0" /></svg>`,
    className: 'vehicle-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    // The rotation is applied via an inline style on the icon's HTML element
  });

  return (
    <Card>
      <Card.Header as="h3" className="bg-white">Live Tracking</Card.Header>
      <Card.Body style={{ height: '60vh', padding: '0' }}>
        {/* The key prop forces a re-render when the center changes, which can be useful */}
        <MapContainer center={driverPosition} zoom={15} style={{ height: '100%', width: '100%' }} key={driverPosition.join('_')}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <Polyline pathOptions={{ color: 'blue' }} positions={routeCoordinates} />
          {/* We need a custom component or a trick to rotate the marker */}
          {/* Here we re-create the divIcon on each render to inject the style */}
          <AnimatedMarker 
            position={driverPosition} 
            icon={vehicleIcon}
            rotationAngle={rotationAngle}
          >
            <Popup>Shuttle Location</Popup>
          </AnimatedMarker>
          <Marker position={parentLocation} icon={redIcon}>
             <Popup>Your Location</Popup>
          </Marker>
        </MapContainer>
      </Card.Body>
      <Card.Footer>
        <Alert variant="info" className="d-flex justify-content-between align-items-center">
          <span>Estimated Time of Arrival (ETA): <strong>{eta > 0 ? `${eta} minutes` : '< 1 minute'}</strong></span>
          <BsGeoAltFill />
        </Alert>
      </Card.Footer>
    </Card>
  );
}

export default LiveTracking;