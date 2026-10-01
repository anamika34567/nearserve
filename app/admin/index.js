import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getSystemReports, getAllComplaints, resolveComplaint } from '../../services/adminService';
import { getReviewsByProvider } from '../../services/reviewService';
import {
  getUnverifiedProviders,
  verifyProvider,
  removeProvider,
  getProviders,
} from '../../services/providerService';
import { getAllUsers, toggleUserBan } from '../../services/adminService';
import { COLORS } from '../../constants';

export default function AdminDashboard() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [reports, setReports] = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [allProviders, setAllProviders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewerModal, setViewerModal] = useState({ visible: false, type: '', data: '' });
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [providerReviews, setProviderReviews] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsData, unverifiedData, providersData, usersData, complaintsData] = await Promise.all([
        getSystemReports(),
        getUnverifiedProviders(),
        getProviders(null, true),
        getAllUsers(),
        getAllComplaints(),
      ]);
      setReports(reportsData);
      setUnverified(unverifiedData);
      setAllProviders(providersData);
      setAllUsers(usersData);
      setAllComplaints(complaintsData);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVerify = async (providerId, name) => {
    Alert.alert('Verify Provider', `Verify "${name}" as a trusted provider?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try {
            await verifyProvider(providerId, true);
            Alert.alert('Success', `${name} has been verified!`);
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to verify provider');
          }
        },
      },
    ]);
  };

  const handleRemoveProvider = async (providerId, name) => {
    Alert.alert('Remove Provider', `Remove "${name}"? This will also delete their reviews.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeProvider(providerId);
            Alert.alert('Removed', `${name} has been removed.`);
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to remove provider');
          }
        },
      },
    ]);
  };

  const handleToggleBan = async (userId, name, currentBan) => {
    const action = currentBan ? 'Unban' : 'Ban';
    Alert.alert(`${action} User`, `${action} "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: currentBan ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await toggleUserBan(userId, !currentBan);
            Alert.alert('Done', `${name} has been ${currentBan ? 'unbanned' : 'banned'}.`);
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to update user');
          }
        },
      },
    ]);
  };

  const handleResolveComplaint = async (complaintId) => {
    Alert.alert('Resolve Complaint', 'Mark this complaint as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            await resolveComplaint(complaintId);
            Alert.alert('Done', 'Complaint marked as resolved.');
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to resolve complaint');
          }
        },
      },
    ]);
  };

  const handleExpandProvider = async (providerId) => {
    if (expandedProvider === providerId) {
      setExpandedProvider(null);
      setProviderReviews([]);
      return;
    }
    setExpandedProvider(providerId);
    try {
      const reviews = await getReviewsByProvider(providerId);
      setProviderReviews(reviews);
    } catch (e) {
      setProviderReviews([]);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.admin} />
      </View>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'verify', label: 'Verify', icon: 'shield-checkmark' },
    { key: 'reviews', label: 'Ratings', icon: 'star' },
    { key: 'complaints', label: 'Issues', icon: 'warning' },
    { key: 'providers', label: 'Providers', icon: 'briefcase' },
    { key: 'users', label: 'Users', icon: 'people' },
  ];

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : i - 0.5 <= rating ? 'star-half' : 'star-outline'}
          size={14}
          color="#FFB800"
        />
      );
    }
    return stars;
  };

  const pendingComplaints = allComplaints.filter(c => c.status === 'pending');
  const resolvedComplaints = allComplaints.filter(c => c.status === 'resolved');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <Text style={styles.headerSub}>Manage NearServe Platform</Text>
      </View>

      {/* Tab Bar - scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBar}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.admin : COLORS.gray}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={COLORS.admin}
          />
        }
      >
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && reports && (
          <View>
            <View style={styles.statsGrid}>
              <StatCard icon="people" label="Users" value={reports.totalUsers} color={COLORS.primary} />
              <StatCard icon="briefcase" label="Providers" value={reports.totalProviders} color={COLORS.secondary} />
              <StatCard icon="calendar" label="Bookings" value={reports.totalBookings} color={COLORS.success} />
              <StatCard icon="star" label="Reviews" value={reports.totalReviews} color="#FF6B6B" />
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="checkmark-circle" label="Verified" value={reports.verifiedProviders} color={COLORS.success} />
              <StatCard icon="alert-circle" label="Unverified" value={reports.unverifiedProviders} color={COLORS.warning} />
              <StatCard icon="checkmark-done" label="Completed" value={reports.completedBookings} color={COLORS.primary} />
              <StatCard icon="cash" label="Revenue" value={`Rs.${reports.totalRevenue}`} color={COLORS.success} />
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="warning" label="Complaints" value={pendingComplaints.length} color={COLORS.danger} />
              <StatCard icon="checkmark-done-circle" label="Resolved" value={resolvedComplaints.length} color={COLORS.success} />
            </View>
          </View>
        )}

        {/* VERIFY TAB */}
        {activeTab === 'verify' && (
          <View>
            <Text style={styles.sectionTitle}>
              Pending Verification ({unverified.length})
            </Text>
            {unverified.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
                <Text style={styles.emptyText}>All providers are verified!</Text>
              </View>
            ) : (
              unverified.map((provider) => (
                <View key={provider.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemAvatar, { backgroundColor: COLORS.warning + '15' }]}>
                      <Ionicons name="person" size={22} color={COLORS.warning} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{provider.name}</Text>
                      <Text style={styles.itemMeta}>
                        {provider.category?.charAt(0).toUpperCase() + provider.category?.slice(1)} | {provider.phone}
                      </Text>
                      <Text style={styles.itemMeta}>Rs.{provider.hourlyRate}/{provider.category === 'autorickshaw' ? 'km' : 'hr'} | {provider.email}</Text>
                    </View>
                  </View>

                  <View style={styles.verifyDetails}>
                    {provider.experience ? (
                      <View style={styles.verifyRow}>
                        <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
                        <Text style={styles.verifyText}>{provider.experience} years experience</Text>
                      </View>
                    ) : null}
                    {provider.skills ? (
                      <View style={styles.verifyRow}>
                        <Ionicons name="build-outline" size={14} color={COLORS.textLight} />
                        <Text style={styles.verifyText}>{provider.skills}</Text>
                      </View>
                    ) : null}
                    {provider.about ? (
                      <View style={styles.verifyRow}>
                        <Ionicons name="document-text-outline" size={14} color={COLORS.textLight} />
                        <Text style={styles.verifyText}>{provider.about}</Text>
                      </View>
                    ) : null}
                    {provider.certUrl ? (
                      <TouchableOpacity style={styles.verifyRow} onPress={() => setViewerModal({ visible: true, type: 'image', data: provider.certUrl })}>
                        <Ionicons name="image" size={14} color="#9C27B0" />
                        <Text style={[styles.verifyText, { color: COLORS.primary, fontWeight: '600' }]}>View Certificate Photo</Text>
                      </TouchableOpacity>
                    ) : null}
                    {!provider.experience && !provider.skills && !provider.about && !provider.certUrl && (
                      <Text style={[styles.verifyText, { color: COLORS.danger, fontStyle: 'italic' }]}>
                        No details provided by provider
                      </Text>
                    )}
                  </View>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.success }]}
                      onPress={() => handleVerify(provider.id, provider.name)}
                    >
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Verify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: COLORS.danger }]}
                      onPress={() => handleRemoveProvider(provider.id, provider.name)}
                    >
                      <Ionicons name="trash" size={18} color={COLORS.white} />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* REVIEWS / RATINGS TAB — show providers, tap to see reviews */}
        {activeTab === 'reviews' && (
          <View>
            <Text style={styles.sectionTitle}>Provider Ratings ({allProviders.length})</Text>
            {allProviders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="star-outline" size={40} color={COLORS.gray} />
                <Text style={styles.emptyText}>No providers yet</Text>
              </View>
            ) : (
              allProviders.map((p) => (
                <View key={p.id}>
                  <TouchableOpacity
                    style={[styles.itemCard, expandedProvider === p.id && { borderLeftWidth: 4, borderLeftColor: '#FFB800' }]}
                    onPress={() => handleExpandProvider(p.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemRow}>
                      <View style={[styles.itemAvatar, { backgroundColor: '#FFB800' + '15' }]}>
                        <Ionicons name="star" size={20} color="#FFB800" />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{p.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          {renderStars(p.rating || 0)}
                          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.text, marginLeft: 4 }}>
                            {p.rating || 0}/5
                          </Text>
                          <Text style={{ fontSize: 12, color: COLORS.textLight }}>
                            ({p.reviewCount || 0} reviews)
                          </Text>
                        </View>
                        <Text style={styles.itemMeta}>{p.category} | Rs.{p.hourlyRate}/{p.category === 'autorickshaw' ? 'km' : 'hr'}</Text>
                      </View>
                      <Ionicons
                        name={expandedProvider === p.id ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={COLORS.gray}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded reviews */}
                  {expandedProvider === p.id && (
                    <View style={{ marginBottom: 10, marginTop: -6 }}>
                      {providerReviews.length === 0 ? (
                        <View style={[styles.reviewComment, { marginHorizontal: 14 }]}>
                          <Text style={styles.reviewCommentText}>No reviews for this provider yet.</Text>
                        </View>
                      ) : (
                        providerReviews.map((review) => (
                          <View key={review.id} style={{ backgroundColor: COLORS.white, marginHorizontal: 14, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{review.userName || 'Anonymous'}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                {renderStars(review.rating)}
                              </View>
                            </View>
                            {review.comment ? (
                              <Text style={{ fontSize: 13, color: COLORS.darkGray, marginTop: 4, fontStyle: 'italic' }}>"{review.comment}"</Text>
                            ) : null}
                            <Text style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* COMPLAINTS / ISSUES TAB */}
        {activeTab === 'complaints' && (
          <View>
            <Text style={styles.sectionTitle}>
              Pending Issues ({pendingComplaints.length})
            </Text>
            {pendingComplaints.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
                <Text style={styles.emptyText}>No pending complaints!</Text>
              </View>
            ) : (
              pendingComplaints.map((c) => (
                <View key={c.id} style={[styles.itemCard, { borderLeftWidth: 4, borderLeftColor: COLORS.danger }]}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemAvatar, { backgroundColor: COLORS.danger + '15' }]}>
                      <Ionicons name="warning" size={20} color={COLORS.danger} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{c.subject || 'Complaint'}</Text>
                      <Text style={styles.itemMeta}>
                        By: {c.userName || 'Unknown'} | Provider: {c.providerName || 'N/A'}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewComment}>
                    <Text style={styles.reviewCommentText}>{c.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: COLORS.success, marginTop: 8 }]}
                    onPress={() => handleResolveComplaint(c.id)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                    <Text style={styles.actionBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {resolvedComplaints.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Resolved ({resolvedComplaints.length})
                </Text>
                {resolvedComplaints.map((c) => (
                  <View key={c.id} style={[styles.itemCard, { borderLeftWidth: 4, borderLeftColor: COLORS.success, opacity: 0.7 }]}>
                    <View style={styles.itemRow}>
                      <View style={[styles.itemAvatar, { backgroundColor: COLORS.success + '15' }]}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{c.subject || 'Complaint'}</Text>
                        <Text style={styles.itemMeta}>
                          By: {c.userName || 'Unknown'} | Provider: {c.providerName || 'N/A'}
                        </Text>
                        <Text style={[styles.itemMeta, { color: COLORS.success }]}>
                          Resolved {c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewComment}>
                      <Text style={styles.reviewCommentText}>{c.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* PROVIDERS TAB */}
        {activeTab === 'providers' && (
          <View>
            <Text style={styles.sectionTitle}>All Providers ({allProviders.length})</Text>
            {allProviders.map((p) => (
              <View key={p.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemAvatar, {
                    backgroundColor: p.isVerified ? COLORS.success + '15' : COLORS.warning + '15'
                  }]}>
                    <Ionicons
                      name={p.isVerified ? 'shield-checkmark' : 'alert-circle'}
                      size={20}
                      color={p.isVerified ? COLORS.success : COLORS.warning}
                    />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{p.name}</Text>
                    <Text style={styles.itemMeta}>
                      {p.category} | Rs.{p.hourlyRate}/{p.category === 'autorickshaw' ? 'km' : 'hr'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      {renderStars(p.rating || 0)}
                      <Text style={{ fontSize: 12, color: COLORS.textLight }}>
                        ({p.rating || 0}) {p.isVerified ? '✓ Verified' : '⏳ Unverified'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: COLORS.danger + '15' }]}
                  onPress={() => handleRemoveProvider(p.id, p.name)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <View>
            <Text style={styles.sectionTitle}>All Users ({allUsers.length})</Text>
            {allUsers.map((u) => (
              <View key={u.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={[styles.itemAvatar, { backgroundColor: COLORS.primary + '15' }]}>
                    <Text style={styles.itemAvatarText}>
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{u.name || 'Unknown'}</Text>
                    <Text style={styles.itemMeta}>
                      {u.email} | {u.role || 'user'}
                      {u.isBanned && ' | BANNED'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: u.isBanned ? COLORS.success + '15' : COLORS.danger + '15' }]}
                  onPress={() => handleToggleBan(u.id, u.name, u.isBanned)}
                >
                  <Ionicons
                    name={u.isBanned ? 'lock-open' : 'ban'}
                    size={16}
                    color={u.isBanned ? COLORS.success : COLORS.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Document Viewer Modal */}
      <Modal visible={viewerModal.visible} animationType="slide" onRequestClose={() => setViewerModal({ visible: false, type: '', data: '' })}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Certificate Photo
            </Text>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setViewerModal({ visible: false, type: '', data: '' })}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {viewerModal.type === 'image' && viewerModal.data ? (
              <Image
                source={{ uri: viewerModal.data }}
                style={styles.certImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons name="document-outline" size={40} color={COLORS.gray} />
                <Text style={styles.emptyText}>No document to display</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  },
  header: {
    backgroundColor: COLORS.admin,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  tabBarScroll: {
    marginTop: -12,
    maxHeight: 60,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 2,
  },
  tabActive: {
    backgroundColor: COLORS.admin + '12',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.gray,
  },
  tabLabelActive: {
    color: COLORS.admin,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
    marginTop: 6,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  verifyDetails: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verifyText: {
    fontSize: 13,
    color: COLORS.darkGray,
    flex: 1,
    lineHeight: 18,
  },
  reviewComment: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  reviewCommentText: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  smallBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 14,
    right: 14,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  certImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
