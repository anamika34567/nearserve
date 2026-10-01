import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService';
import { COLORS } from '../constants';

const NOTIF_ICONS = {
  booking: 'calendar',
  chat: 'chatbubble',
  verification: 'shield-checkmark',
  system: 'information-circle',
};

const NOTIF_COLORS = {
  booking: COLORS.primary,
  chat: COLORS.chat,
  verification: COLORS.success,
  system: COLORS.warning,
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await getUserNotifications(user.uid);
      setNotifications(data);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.log('Error:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.log('Error:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderNotification = ({ item }) => {
    const iconName = NOTIF_ICONS[item.type] || 'notifications';
    const iconColor = NOTIF_COLORS[item.type] || COLORS.primary;

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        onPress={() => handleMarkRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIcon, { backgroundColor: iconColor + '15' }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.notifBody}>
          <Text style={[styles.notifText, !item.isRead && styles.notifTextUnread]}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={18} color={COLORS.primary} />
          <Text style={styles.markAllText}>Mark all as read ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={50} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        }
      />
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
  list: {
    padding: 16,
  },

  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: COLORS.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  notifCardUnread: {
    backgroundColor: COLORS.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
  },
  notifText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  notifTextUnread: {
    fontWeight: '600',
  },
  notifTime: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});
