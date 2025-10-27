import React, { useEffect, useRef } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';

const AnimatedMarker = ({ position, icon, rotationAngle, children }) => {
  const markerRef = useRef(null);
  const previousPosition = useRef(position);

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      const duration = 3000; // Animation duration in ms
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const lat = previousPosition.current[0] + (position[0] - previousPosition.current[0]) * progress;
        const lng = previousPosition.current[1] + (position[1] - previousPosition.current[1]) * progress;

        marker.setLatLng([lat, lng]);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          previousPosition.current = position;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [position]);

  return (
    <Marker
      ref={markerRef}
      position={previousPosition.current}
      icon={new L.divIcon({ ...icon.options, html: `<div style="transform: rotate(${rotationAngle}deg);">${icon.options.html}</div>` })}
    >
      {children}
    </Marker>
  );
};

export default AnimatedMarker;
