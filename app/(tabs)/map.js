import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocation } from '../../context/LocationContext';
import { getNearbyProviders } from '../../services/providerService';
import { COLORS } from '../../constants';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const userLat = location?.latitude || 8.881;
  const userLng = location?.longitude || 76.6141;

  useEffect(() => {
    fetchProviders();
  }, [location, selectedCategory]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await getNearbyProviders(
        userLat, userLng, 50,
        selectedCategory === 'all' ? null : selectedCategory
      );
      setProviders(data);
    } catch (error) {
      console.log('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (category) => {
    if (category === 'plumber') return '#2196F3';
    if (category === 'electrician') return '#FF9800';
    return '#4CAF50';
  };

  const generateMapHTML = () => {
    const markersJS = providers.map((p, i) => {
      const color = getMarkerColor(p.category);
      const name = (p.name || '').replace(/'/g, "\\'");
      const cat = (p.category || '').charAt(0).toUpperCase() + (p.category || '').slice(1);
      return `
        var marker${i} = L.marker([${p.latitude || 0}, ${p.longitude || 0}], {
          icon: L.divIcon({
            className: 'provider-marker',
            html: '<div class="marker-pin" style="background:${color}"><span class="marker-icon">${cat === 'Plumber' ? '🔧' : '⚡'}</span></div><div class="marker-label" style="border-color:${color}">${name}</div>',
            iconSize: [40, 60],
            iconAnchor: [20, 55],
            popupAnchor: [0, -55]
          })
        }).addTo(map);
        marker${i}.bindPopup(
          '<b>${name}</b><br>' +
          '${cat}<br>' +
          'Rs.${p.hourlyRate || 0}/hr<br>' +
          '${p.distance || 0} km away<br>' +
          '<a href="provider://${p.id}">View Profile</a>'
        );
      `;
    }).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
    .user-marker {
      width: 16px; height: 16px;
      background: #4285F4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(66,133,244,0.5);
    }
    .user-pulse {
      width: 40px; height: 40px;
      background: rgba(66,133,244,0.15);
      border-radius: 50%;
      position: absolute;
      top: -12px; left: -12px;
    }
    .provider-marker { background: none; border: none; }
    .marker-pin {
      width: 36px; height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .marker-icon {
      transform: rotate(45deg);
      font-size: 16px;
    }
    .marker-label {
      position: absolute;
      top: 40px; left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #1a1a2e;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      border-top: 2px solid;
    }
    .leaflet-popup-content { font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; }
    .leaflet-popup-content b { font-size: 14px; color: #1a1a2e; }
    .leaflet-popup-content a { color: #2196F3; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${userLat}, ${userLng}], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // User location marker
    var userIcon = L.divIcon({
      className: 'user-marker-container',
      html: '<div class="user-pulse"></div><div class="user-marker"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map)
      .bindPopup('<b>Your Location</b>');

    // Provider markers
    ${markersJS}

    // Handle popup link clicks
    document.addEventListener('click', function(e) {
      if (e.target.tagName === 'A' && e.target.href.startsWith('provider://')) {
        e.preventDefault();
        var id = e.target.href.replace('provider://', '');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigate', providerId: id }));
      }
    });
  </script>
</body>
</html>`;
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'navigate' && data.providerId) {
        router.push(`/provider/${data.providerId}`);
      }
    } catch (e) {}
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'apps' },
    { key: 'plumber', label: 'Plumber', icon: 'water' },
    { key: 'electrician', label: 'Electrician', icon: 'flash' },
  ];

  if (loading && providers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <WebView
        style={styles.map}
        source={{ html: generateMapHTML() }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        )}
      />

      {/* Floating Filter Bar */}
      <View style={styles.filterOverlay}>
        <View style={styles.filterRow}>
          {filters.map((filter) => {
            const isActive = selectedCategory === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedCategory(filter.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={filter.icon}
                  size={16}
                  color={isActive ? COLORS.white : COLORS.primary}
                />
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Floating Info Bar */}
      <View style={styles.infoBar}>
        <Ionicons name="location" size={16} color={COLORS.primary} />
        <Text style={styles.infoText}>{providers.length} providers nearby</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textLight,
  },
  map: {
    width: width,
    height: height,
  },
  filterOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filterLabelActive: {
    color: COLORS.white,
  },
  infoBar: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
});
