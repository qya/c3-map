import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap, MapMouseEvent, GeoJSONSource } from 'maplibre-gl';
import * as h3 from 'h3-js';
import { MapPin, Navigation } from 'lucide-react';
import { decodeInputCode, getCellGeometry } from '../utils/geoUtils';
import { C3Codec } from '../utils/c3Codec';
import SearchBar, { type MapStyleId, type UiLanguage } from './SearchBar';
import AddressDetail from './AddressDetail';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import { Map, MapControls, MapMarker, MarkerContent, useMap } from '@/components/ui/map';
import { Card } from '@/components/ui/card';

interface MapViewProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  hexPreviewEnabled: boolean;
  onHexPreviewToggle: (enabled: boolean) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const JATIKARYA_CENTER: [number, number] = [106.9221, -6.3694];
const EMPTY_COLLECTION = { type: 'FeatureCollection' as const, features: [] };

const standardStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const darkStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const voyagerStyle = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
const terrainStyle = {
  version: 8 as const,
  sources: {
    terrain: {
      type: 'raster' as const,
      tiles: ['https://tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap',
    },
  },
  layers: [
    {
      id: 'terrain',
      type: 'raster' as const,
      source: 'terrain',
      minzoom: 0,
      maxzoom: 17,
    },
  ],
};
const satelliteStyle = {
  version: 8 as const,
  sources: {
    satellite: {
      type: 'raster' as const,
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Tiles © Esri',
    },
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster' as const,
      source: 'satellite',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const getMapStyles = (mapStyle: MapStyleId) => {
  if (mapStyle === 'satellite') {
    return {
      light: satelliteStyle,
      dark: satelliteStyle,
    };
  }

  if (mapStyle === 'dark') {
    return {
      light: darkStyle,
      dark: darkStyle,
    };
  }

  if (mapStyle === 'voyager') {
    return {
      light: voyagerStyle,
      dark: voyagerStyle,
    };
  }

  if (mapStyle === 'terrain') {
    return {
      light: terrainStyle,
      dark: terrainStyle,
    };
  }

  return {
    light: standardStyle,
    dark: darkStyle,
  };
};

const getGridResolution = (zoom: number) => {
  if (zoom < 5) return 3;
  if (zoom < 7) return 4;
  if (zoom < 9) return 5;
  if (zoom < 11) return 6;
  if (zoom < 13) return 7;
  if (zoom < 15) return 8;
  if (zoom < 17) return 9;
  return 10;
};

const getBufferedBoundsPolygon = (map: MapLibreMap) => {
  const bounds = map.getBounds();
  const lngPadding = Math.max((bounds.getEast() - bounds.getWest()) * 0.18, 0.002);
  const latPadding = Math.max((bounds.getNorth() - bounds.getSouth()) * 0.18, 0.002);
  const west = bounds.getWest() - lngPadding;
  const south = bounds.getSouth() - latPadding;
  const east = bounds.getEast() + lngPadding;
  const north = bounds.getNorth() + latPadding;

  return [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ];
};

function ZoomObserver({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const syncZoom = () => onZoomChange(map.getZoom());
    syncZoom();
    map.on('zoom', syncZoom);
    map.on('moveend', syncZoom);

    return () => {
      map.off('zoom', syncZoom);
      map.off('moveend', syncZoom);
    };
  }, [isLoaded, map, onZoomChange]);

  return null;
}

function SelectedCellUpdater({ h3Code }: { h3Code?: string }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const source = map.getSource('selected-cell') as GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: 'FeatureCollection',
      features: h3Code ? [getCellGeometry(h3Code)] : [],
    });
  }, [h3Code, isLoaded, map]);

  return null;
}

function HexLayers({
  hexPreviewEnabled,
  searchQuery,
  onCellSelect,
}: {
  hexPreviewEnabled: boolean;
  searchQuery: string;
  onCellSelect: (cell: { h3: string; c3: string } | null, coords: { lat: number; lng: number } | null) => void;
}) {
  const { map, isLoaded } = useMap();
  const [styleReady, setStyleReady] = useState(false);
  const selectedCellRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);

  const updateGrid = useCallback(() => {
    if (!map || !styleReady || !hexPreviewEnabled) return;

    const resolution = getGridResolution(map.getZoom());

    try {
      const cells = h3.polygonToCells(getBufferedBoundsPolygon(map), resolution, true);
      const features = cells.map((cell) => getCellGeometry(cell));

      const source = map.getSource('grid') as GeoJSONSource | undefined;
      source?.setData({
        type: 'FeatureCollection',
        features,
      });
    } catch (error) {
      console.error('Grid generation error:', error);
    }
  }, [hexPreviewEnabled, map, styleReady]);

  const scheduleGridUpdate = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      updateGrid();
    });
  }, [updateGrid]);

  useEffect(() => {
    if (!isLoaded || !map) return;

    if (!map.getSource('grid')) {
      map.addSource('grid', {
        type: 'geojson',
        data: EMPTY_COLLECTION,
      });
    }

    if (!map.getLayer('grid-layer')) {
      map.addLayer({
        id: 'grid-layer',
        type: 'fill',
        source: 'grid',
        layout: {
          visibility: hexPreviewEnabled ? 'visible' : 'none',
        },
        paint: {
          'fill-antialias': false,
          'fill-color': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            '#4285f4',
            13,
            '#1a73e8',
            18,
            '#0b57d0',
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            0.08,
            13,
            0.13,
            18,
            0.2,
          ],
        },
      });
    }

    if (!map.getLayer('grid-outline')) {
      map.addLayer({
        id: 'grid-outline',
        type: 'line',
        source: 'grid',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: hexPreviewEnabled ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#0b57d0',
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.55, 12, 0.85, 18, 1.35],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.35, 12, 0.52, 18, 0.72],
        },
      });
    }

    if (!map.getSource('selected-cell')) {
      map.addSource('selected-cell', {
        type: 'geojson',
        data: EMPTY_COLLECTION,
      });
    }

    if (!map.getLayer('selected-cell-layer')) {
      map.addLayer({
        id: 'selected-cell-layer',
        type: 'fill',
        source: 'selected-cell',
        paint: {
          'fill-antialias': false,
          'fill-color': '#d93025',
          'fill-opacity': 0.28,
        },
      });
    }

    if (!map.getLayer('selected-cell-outline')) {
      map.addLayer({
        id: 'selected-cell-outline',
        type: 'line',
        source: 'selected-cell',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#a50e0e',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
    }

    setStyleReady(true);

    if (selectedCellRef.current) {
      const source = map.getSource('selected-cell') as GeoJSONSource | undefined;
      source?.setData({
        type: 'FeatureCollection',
        features: [getCellGeometry(selectedCellRef.current)],
      });
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [hexPreviewEnabled, isLoaded, map]);

  // Handle map clicks
  useEffect(() => {
    if (!map) return;

    const handleClick = (e: MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      const h3Index = h3.latLngToCell(lat, lng, 15);
      const c3Code = C3Codec.compresC3(h3Index);

      selectedCellRef.current = h3Index;
      const source = map.getSource('selected-cell') as GeoJSONSource | undefined;
      source?.setData({
        type: 'FeatureCollection',
        features: [getCellGeometry(h3Index)],
      });
      onCellSelect({ h3: h3Index, c3: c3Code }, { lat, lng });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onCellSelect]);

  // Hex preview grid
  useEffect(() => {
    if (!map || !styleReady) return;

    if (!hexPreviewEnabled) {
      if (map.getLayer('grid-layer')) map.setLayoutProperty('grid-layer', 'visibility', 'none');
      if (map.getLayer('grid-outline')) map.setLayoutProperty('grid-outline', 'visibility', 'none');
      return;
    }

    if (map.getLayer('grid-layer')) map.setLayoutProperty('grid-layer', 'visibility', 'visible');
    if (map.getLayer('grid-outline')) map.setLayoutProperty('grid-outline', 'visibility', 'visible');
    updateGrid();
  }, [hexPreviewEnabled, map, styleReady, updateGrid]);

  // Refresh grid on move
  useEffect(() => {
    if (!map || !styleReady || !hexPreviewEnabled) return;

    map.on('moveend', scheduleGridUpdate);
    map.on('zoomend', scheduleGridUpdate);
    map.on('idle', scheduleGridUpdate);
    return () => {
      map.off('moveend', scheduleGridUpdate);
      map.off('zoomend', scheduleGridUpdate);
      map.off('idle', scheduleGridUpdate);
    };
  }, [map, scheduleGridUpdate, styleReady, hexPreviewEnabled]);

  // Search query → fly to cell
  useEffect(() => {
    if (!searchQuery || !map || !styleReady) return;

    const result = decodeInputCode(searchQuery);

    if (result.valid && result.h3) {
      const coords = h3.cellToLatLng(result.h3);
      const [lat, lng] = coords;

      onCellSelect(result, { lat, lng });
      selectedCellRef.current = result.h3;

      map.flyTo({
        center: [lng, lat],
        zoom: 15,
        speed: 0.8,
        curve: 1.4,
      });

      const geometry = getCellGeometry(result.h3);
      const source = map.getSource('selected-cell') as GeoJSONSource | undefined;
      source?.setData({
        type: 'FeatureCollection',
        features: [geometry],
      });
    } else {
      onCellSelect(null, null);
      selectedCellRef.current = null;
      const source = map.getSource('selected-cell') as GeoJSONSource | undefined;
      source?.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [searchQuery, map, styleReady, onCellSelect]);

  return null;
}

const MapView: React.FC<MapViewProps> = ({
  searchQuery,
  onSearch,
  hexPreviewEnabled,
  onHexPreviewToggle,
  theme,
  onThemeToggle,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ h3: string; c3: string } | null>(null);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<UiLanguage>('en');
  const [mapStyle, setMapStyle] = useState<MapStyleId>('standard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapZoom, setMapZoom] = useState(10.5);

  const { address, loading } = useReverseGeocode(
    clickedCoords?.lat || 0,
    clickedCoords?.lng || 0,
  );

  const handleCellSelect = useCallback(
    (cell: { h3: string; c3: string } | null, coords: { lat: number; lng: number } | null) => {
      setSelectedCell(cell);
      setClickedCoords(coords);
      setIsLoading(false);
    },
    [],
  );

  const handleLocate = useCallback((coords: { longitude: number; latitude: number }) => {
    const h3Index = h3.latLngToCell(coords.latitude, coords.longitude, 15);
    const c3Code = C3Codec.compresC3(h3Index);

    setSelectedCell({ h3: h3Index, c3: c3Code });
    setClickedCoords({ lat: coords.latitude, lng: coords.longitude });
    setIsLoading(false);
  }, []);

  return (
    <Card className="relative h-screen w-full overflow-hidden rounded-none border-0 bg-background p-0">
      <Map center={JATIKARYA_CENTER} zoom={10.5} theme={theme} styles={getMapStyles(mapStyle)}>
        <ZoomObserver onZoomChange={setMapZoom} />
        <MapControls
          showZoom
          showLocate
          position="bottom-right"
          className="z-50"
          onLocate={handleLocate}
        />
        <HexLayers
          hexPreviewEnabled={hexPreviewEnabled}
          searchQuery={searchQuery}
          onCellSelect={handleCellSelect}
        />
        <SelectedCellUpdater h3Code={selectedCell?.h3} />
        {clickedCoords && mapZoom < 17 && (
          <MapMarker longitude={clickedCoords.lng} latitude={clickedCoords.lat} anchor="bottom">
            <MarkerContent>
              <div className="relative flex h-11 w-11 items-center justify-center">
                <span className="absolute h-8 w-8 rounded-full bg-red-700/20" />
                <MapPin className="relative size-10 fill-red-700 text-red-950 drop-shadow-md" strokeWidth={1.8} />
              </div>
            </MarkerContent>
          </MapMarker>
        )}
      </Map>

      <SearchBar
        onSearch={onSearch}
        onHexPreviewToggle={onHexPreviewToggle}
        hexPreviewEnabled={hexPreviewEnabled}
        isLoading={isLoading}
        theme={theme}
        onThemeToggle={onThemeToggle}
        language={language}
        onLanguageToggle={() => setLanguage((current) => (current === 'en' ? 'id' : 'en'))}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={setSidebarOpen}
      />

      <AddressDetail
        address={address}
        loading={loading}
        h3Code={selectedCell?.h3}
        c3Code={selectedCell?.c3}
        language={language}
      />

      <div
        className={`absolute bottom-4 left-3 z-40 hidden transition-transform duration-200 ease-out md:block ${sidebarOpen ? 'md:translate-x-[250px]' : 'md:translate-x-0'
          }`}
      >
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground shadow-[0_8px_24px_oklch(0.22_0.012_252_/_0.16)] dark:shadow-[0_8px_28px_oklch(0_0_0_/_0.45)]">
          <Navigation className="size-3.5 text-primary" />
          <span>
            {language === 'id'
              ? 'Klik peta untuk mengambil data C3, H3, dan alamat.'
              : 'Click the map to capture C3, H3, and address data.'}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default MapView;
