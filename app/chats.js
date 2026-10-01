import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getUserChatRooms, getProviderChatRooms } from '../services/messageService';
import { getProviderById } from '../services/providerService';
import { getUserProfile } from '../services/authService';
import { COLORS } from '../constants';

export default function ChatsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isProvider = userProfile?.role === 'provider';

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [user])
  );

  const fetchChats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let rooms;
      if (isProvider) {
        // Get provider's chat rooms - need to find provider doc first
        const { getProviderByUserId } = require('../services/providerService');
        const providerDoc = await getProviderByUserId(user.uid);
        if (providerDoc) {
          rooms = await getProviderChatRooms(providerDoc.id);
        } else {
          rooms = [];
        }
      } else {
        rooms = await getUserChatRooms(user.uid);
      }

      // Fetch names for each chat room
      const enriched = await Promise.all(
        rooms.map(async (room) => {
          let otherName = 'Unknown';
          try {
            if (isProvider) {
              // Provider sees customer name
              const userDoc = await getUserProfile(room.userId);
              otherName = userDoc?.name || 'Customer';
            } else {
              // Customer sees provider name
              const providerDoc = await getProviderById(room.providerId);
              otherName = providerDoc?.name || 'Provider';
            }
          } catch (e) {}
          return { ...room, otherName };
        })
      );

      setChatRooms(enriched);
    } catch (error) {
      console.log('Error fetching chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenChat = (room) => {
    router.push({ pathname: `/chat/${room.providerId}`, params: { roomId: room.id, otherName: room.otherName } });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleOpenChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatAvatar}>
        <Text style={styles.chatAvatarText}>
          {(item.otherName || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName} numberOfLines={1}>{item.otherName}</Text>
          <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={styles.chatLastMsg} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Chats</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={chatRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchChats(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>No Chats Yet</Text>
            <Text style={styles.emptyText}>
              {isProvider
                ? 'Chats will appear here when customers message you.'
                : 'Start a chat by visiting a provider\'s profile and tapping "Chat".'}
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  list: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  chatAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  chatLastMsg: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
