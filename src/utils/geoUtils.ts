import * as h3 from 'h3-js';
import { C3Codec } from './c3Codec';

type DecodeInputResult =
  | { valid: true; h3: string; c3: string }
  | { valid: false; h3: null; c3: null };

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

const parseCoordinateInput = (input: string): { lat: number; lng: number } | null => {
  const match = input.match(COORDINATE_PATTERN);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

export const isValidH3 = (code: string): boolean => {
  if (!code) return false;

  try {
    const resolution = h3.getResolution(code);
    return resolution >= 0 && resolution <= 15;
  } catch (e) {
    return false;
  }
};

export const isValidC3 = (code: string): boolean => {
  if (!code) return false;

  try {
    const normalized = code.toUpperCase().trim();
    const decompressed = C3Codec.decompresC3(normalized);
    return isValidH3(decompressed);
  } catch (e) {
    return false;
  }
};

export const decodeInputCode = (input: string): DecodeInputResult => {
  const rawTrimmed = input.trim();
  const trimmed = rawTrimmed.toUpperCase();

  if (!trimmed) {
    return { valid: false, h3: null, c3: null };
  }

  const coordinates = parseCoordinateInput(rawTrimmed);
  if (coordinates) {
    const h3Index = h3.latLngToCell(coordinates.lat, coordinates.lng, 15);
    const c3 = C3Codec.compresC3(h3Index);
    return { valid: true, h3: h3Index, c3 };
  }

  if (trimmed.startsWith('8')) {
    if (isValidH3(trimmed)) {
      const c3 = C3Codec.compresC3(trimmed);
      return { valid: true, h3: trimmed, c3 };
    }
  } else {
    if (isValidC3(trimmed)) {
      const h3Index = C3Codec.decompresC3(trimmed);
      return { valid: true, h3: h3Index, c3: trimmed };
    }
  }

  return { valid: false, h3: null, c3: null };
};

export const getCellGeometry = (h3Index: string) => {
  const coordinates = h3.cellToBoundary(h3Index, true);
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coordinates]
    }
  };
};
