# C3 Map Explorer

C3 Map Explorer is a React + Vite map application for inspecting H3 cells and sharing shorter C3 location codes. C3 is a compact, more human-readable representation of an H3 hex code: a 15-character H3 code can be represented as an 11-character C3 code.

## Features

- Interactive MapLibre map centered around Jatikarya, Indonesia.
- Click the map to capture the selected cell's C3 code, H3 index, coordinates, and reverse-geocoded address.
- Search by C3 code, H3 code, or coordinates such as `-8.236959, 111.457310`.
- Address autocomplete for street/place names, with suggestions shown below the search input.
- Autocomplete is disabled for C3/H3-like input and coordinates.
- Optional H3 hex grid preview with zoom-aware resolution.
- Map style switcher: Standard, Voyager, Terrain, Dark, and Satellite.
- Light/dark theme toggle with local storage persistence.
- English and Indonesian UI language toggle.
- Help dialog, feedback page, privacy page, and custom SVG favicon.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- MapLibre GL
- h3-js
- Turf
- Lucide React icons

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  App.tsx                    App shell and theme state
  components/
    MapView.tsx              Main map, H3 layers, markers, controls
    SearchBar.tsx            Sidebar, search, address autocomplete, help dialog
    AddressDetail.tsx        Selected address and code details panel
    ui/                      Local UI primitives
  hooks/
    useReverseGeocode.ts     Reverse geocoding hook
  utils/
    c3Codec.ts               C3 encode/decode implementation
    geoUtils.ts              H3/C3/coordinate parsing helpers
public/
  favicon.svg
  feedback.html
  privacy.html
```

## Search Behavior

The search input accepts:

- C3 code
- H3 hex code
- Latitude/longitude coordinates in `lat, lng` format
- Street or place names through address autocomplete

When a suggestion is selected, the app converts the suggestion coordinate into a resolution-15 H3 cell and moves the map to that location.

## External Services

The app uses public map and geocoding services:

- CARTO basemaps
- OpenTopoMap terrain tiles
- Esri satellite tiles
- OpenStreetMap Nominatim for search and reverse geocoding

Check each provider's usage policy before deploying at production traffic levels.
