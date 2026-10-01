import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../constants';

const validCoordinate = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;

const createMapHtml = (buildingLocation, technicianLocation) => {
  const centerLatitude = buildingLocation?.latitude ?? technicianLocation?.latitude ?? 25.2048;
  const centerLongitude = buildingLocation?.longitude ?? technicianLocation?.longitude ?? 55.2708;
  const buildingMarker = buildingLocation
    ? `buildingMarker = L.marker([${buildingLocation.latitude}, ${buildingLocation.longitude}], { icon: buildingIcon }).addTo(map).bindPopup('Building');`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .tech-pin { width: 22px; height: 22px; border: 3px solid white; border-radius: 50%; background: #2478C8; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
    .building-pin { width: 22px; height: 22px; border: 3px solid white; border-radius: 7px; background: #25845A; box-shadow: 0 2px 8px rgba(0,0,0,.3); }
    .leaflet-popup-content-wrapper { border-radius: 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${centerLatitude}, ${centerLongitude}], ${buildingLocation ? 15 : 13});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    var technicianMarker = null;
    var buildingMarker = null;
    var routeLine = null;
    var technicianIcon = L.divIcon({ className: '', html: '<div class="tech-pin"></div>', iconSize: [28, 28], iconAnchor: [14, 14] });
    var buildingIcon = L.divIcon({ className: '', html: '<div class="building-pin"></div>', iconSize: [28, 28], iconAnchor: [14, 14] });
    ${buildingMarker}

    window.setTechnicianLocation = function(latitude, longitude) {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      var point = [latitude, longitude];
      if (!technicianMarker) {
        technicianMarker = L.marker(point, { icon: technicianIcon }).addTo(map).bindPopup('Technician');
      } else {
        technicianMarker.setLatLng(point);
      }
      if (buildingMarker) {
        if (!routeLine) routeLine = L.polyline([point, buildingMarker.getLatLng()], { color: '#2478C8', weight: 4, opacity: 0.75, dashArray: '7, 8' }).addTo(map);
        else routeLine.setLatLngs([point, buildingMarker.getLatLng()]);
        map.panTo(point, { animate: true });
      } else {
        map.setView(point, 15, { animate: true });
      }
    };
    ${technicianLocation ? `window.setTechnicianLocation(${technicianLocation.latitude}, ${technicianLocation.longitude});` : ''}
  </script>
</body>
</html>`;
};

export default function MaintenanceLiveMap({ buildingLatitude, buildingLongitude, technicianLocation }) {
  const webViewRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const hasBuildingLocation = validCoordinate(buildingLatitude, -90, 90)
    && validCoordinate(buildingLongitude, -180, 180);
  const hasTechnicianLocation = validCoordinate(technicianLocation?.latitude, -90, 90)
    && validCoordinate(technicianLocation?.longitude, -180, 180);
  const buildingLocation = hasBuildingLocation ? { latitude: buildingLatitude, longitude: buildingLongitude } : null;
  const [html] = useState(() => createMapHtml(buildingLocation, null));

  useEffect(() => {
    if (!loaded || !hasTechnicianLocation) return;
    webViewRef.current?.injectJavaScript(
      `window.setTechnicianLocation(${technicianLocation.latitude}, ${technicianLocation.longitude}); true;`
    );
  }, [loaded, technicianLocation?.latitude, technicianLocation?.longitude]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onLoadEnd={() => setLoaded(true)}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading live map...</Text>
          </View>
        )}
        startInLoadingState
      />
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={styles.technicianDot} /><Text style={styles.legendText}>Technician</Text></View>
        {hasBuildingLocation && <View style={styles.legendItem}><View style={styles.buildingDot} /><Text style={styles.legendText}>Building</Text></View>}
      </View>
      {!hasBuildingLocation && <Text style={styles.pinHint}>The manager still needs to set the building map pin.</Text>}
      {!hasTechnicianLocation && <Text style={styles.pinHint}>Waiting for the technician’s first GPS update.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 270, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: COLORS.textLight, fontSize: 12 },
  legend: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 10, backgroundColor: COLORS.white, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  technicianDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#2478C8' },
  buildingDot: { width: 9, height: 9, borderRadius: 3, backgroundColor: '#25845A' },
  legendText: { color: COLORS.text, fontSize: 10, fontWeight: '700' },
  pinHint: { backgroundColor: COLORS.white, color: COLORS.textLight, fontSize: 11, paddingHorizontal: 10, paddingVertical: 5 },
});
