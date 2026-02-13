import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon
const truckIcon = (online: boolean) => L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'} text-white shadow-lg">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface Position {
  id: number;
  camionId?: number;
  camion?: { immatriculation: string; typeCamion: string };
  lat: number;
  lng: number;
  vitesse?: number;
  enLigne: boolean;
  derniereMaj?: string;
}

interface GpsMapProps {
  positions: Position[];
  onSelectPosition?: (position: Position) => void;
}

// Component to fit bounds when positions change
function FitBounds({ positions }: { positions: Position[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

export default function GpsMap({ positions, onSelectPosition }: GpsMapProps) {
  // Default center on Dakar, Senegal
  const defaultCenter: [number, number] = [14.6937, -17.4441];
  const defaultZoom = 12;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="h-full w-full rounded-lg"
      style={{ minHeight: '400px' }}
    >
      <LayersControl position="topright">
        {/* Street Map Layer */}
        <LayersControl.BaseLayer checked name="Plan">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* Satellite Layer - Esri World Imagery */}
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {/* Hybrid Layer - Satellite with labels */}
        <LayersControl.BaseLayer name="Hybride">
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {positions.length > 0 && <FitBounds positions={positions} />}

      {positions.map((position) => (
        <Marker
          key={position.id}
          position={[position.lat, position.lng]}
          icon={truckIcon(position.enLigne)}
          eventHandlers={{
            click: () => onSelectPosition?.(position),
          }}
        >
          <Popup>
            <div className="min-w-[150px]">
              <p className="font-bold text-gray-900">
                {position.camion?.immatriculation || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">
                {position.camion?.typeCamion}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Vitesse:</span> {position.vitesse || 0} km/h
                </p>
                <p>
                  <span className="font-medium">Position:</span><br />
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </p>
                <p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    position.enLigne ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {position.enLigne ? 'En ligne' : 'Hors ligne'}
                  </span>
                </p>
                {position.derniereMaj && (
                  <p className="text-gray-500 text-xs">
                    Dernière maj: {new Date(position.derniereMaj).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
