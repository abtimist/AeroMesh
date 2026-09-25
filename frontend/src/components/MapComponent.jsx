import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to handle Canvas 2D wind animation
function WindAnimationLayer({ windData }) {
  const map = useMap();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Update canvas size on map move
    const updateCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      
      // Basic mock particle drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      
      // In a real app we'd convert lat/lon wind vectors to pixel coords
      // Mocking 100 particles flowing
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw a small line representing vector
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10, y + 5); // Mock wind blowing East-SouthEast
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    map.on('moveend', updateCanvas);
    updateCanvas();
    
    // Quick animation loop for mock
    let animationFrame;
    let offset = 0;
    const animate = () => {
      offset += 1;
      // We would redraw particles here based on actual wind physics
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      map.off('moveend', updateCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, [map, windData]);

  return (
    <div className="leaflet-pane leaflet-overlay-pane" style={{ zIndex: 500 }}>
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} 
      />
    </div>
  );
}

export default function MapComponent() {
  const [plumeGeoJson, setPlumeGeoJson] = useState(null);
  const [mockEventId, setMockEventId] = useState(1);

  // Styling for the Gaussian plume polygon
  const plumeStyle = {
    fillColor: '#ef4444', // Red-500
    weight: 2,
    opacity: 1,
    color: '#b91c1c', // Red-700
    dashArray: '3',
    fillOpacity: 0.4
  };

  useEffect(() => {
    // In a real app we'd fetch this from our FastAPI /plume-forecast/{event_id}
    // For now we mock it with a static polygon over India
    setPlumeGeoJson({
      type: "Feature",
      properties: {
        event_id: 1,
        severity: "CRITICAL",
        type: "plume_forecast"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [77.20, 28.61], // New Delhi area
          [78.00, 29.00],
          [79.50, 28.50],
          [78.00, 27.50],
          [77.20, 28.61]
        ]]
      }
    });
  }, []);

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-lg border border-slate-200 relative">
      <MapContainer 
        center={[28.6139, 77.2090]} // Centered on New Delhi
        zoom={6} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        {/* Modern dark-themed map tiles for better contrast with overlays */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {/* Draw the Gaussian Plume forecast */}
        {plumeGeoJson && (
          <GeoJSON 
            data={plumeGeoJson} 
            style={plumeStyle}
          />
        )}
        
        {/* Render Canvas 2D Wind Particles */}
        <WindAnimationLayer windData={[]} />
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/80 backdrop-blur-md p-4 rounded-lg border border-slate-700 text-slate-200 shadow-xl pointer-events-none">
        <h4 className="text-sm font-semibold mb-2">Live Weather & Plumes</h4>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-4 bg-red-500/40 border border-red-700 rounded-sm"></div>
          <span>Forecasted Plume</span>
        </div>
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className="w-4 h-[2px] bg-white/50"></div>
          <span>Wind Vector</span>
        </div>
      </div>
    </div>
  );
}
