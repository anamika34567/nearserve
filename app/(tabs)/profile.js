import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { seedProviders } from '../../services/seedData';
import { COLORS } from '../../constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userProfile, logout } = useAuth();
  const { location } = useLocation();
  const [seeding, setSeeding] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const lat = location?.latitude || 17.385;
      const lng = location?.longitude || 78.4867;
      const result = await seedProviders(lat, lng);
      if (result) {
        Alert.alert('Success', '6 demo providers added near your location! Go to Home to see them.');
      } else {
        Alert.alert('Info', 'Providers already exist in the database.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add providers: ' + error.message);
    } finally {
      setSeeding(false);
    }
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', color: COLORS.primary },
        { icon: 'location-outline', label: 'My Addresses', color: COLORS.secondary },
        { icon: 'card-outline', label: 'Payment Methods', color: COLORS.success },
      ],
    },
    {
      title: 'Activity',
      items: [
        { icon: 'calendar-outline', label: 'Booking History', color: '#9C27B0', onPress: () => router.push('/(tabs)/bookings') },
        { icon: 'star-outline', label: 'My Reviews', color: COLORS.secondary },
        { icon: 'heart-outline', label: 'Favorites', color: COLORS.danger },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', color: COLORS.primary },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', color: COLORS.success },
        { icon: 'document-text-outline', label: 'Terms of Service', color: COLORS.textLight },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.headerBg}>
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />

          <View style={styles.profileSection}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(userProfile?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.editAvatarBtn}>
                <Ionicons name="camera" size={12} color={COLORS.white} />
              </View>
            </View>

            <Text style={styles.userName}>
              {userProfile?.name || user?.displayName || 'User'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || 'amal'}</Text>

            <View style={styles.profileStats}>
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>0</Text>
                <Text style={styles.profileStatLabel}>Bookings</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>0</Text>
                <Text style={styles.profileStatLabel}>Reviews</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStatItem}>
                <Text style={styles.profileStatNum}>
                  {userProfile?.role === 'provider' ? 'Pro' : 'User'}
                </Text>
                <Text style={styles.profileStatLabel}>Type</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '12' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Seed Demo Data */}
        <TouchableOpacity
          style={styles.seedBtn}
          onPress={handleSeedData}
          disabled={seeding}
          activeOpacity={0.7}
        >
          <View style={styles.seedIcon}>
            {seeding ? (
              <ActivityIndicator size="small" color={COLORS.success} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color={COLORS.success} />
            )}
          </View>
          <Text style={styles.seedText}>
            {seeding ? 'Adding Providers...' : 'Add Demo Providers'}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>NearServe v1.0.0</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  headerBg: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -30,
    right: -30,
  },
  headerCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 10,
    left: -20,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 85,
    height: 85,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
  profileStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  profileStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontWeight: '500',
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Menu
  menuSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.danger + '10',
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
  },
  // Seed Button
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: COLORS.success + '10',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
  },
  seedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seedText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 20,
  },
});
