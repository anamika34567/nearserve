import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getProviderById } from '../../services/providerService';
import { getUserProfile } from '../../services/authService';
import {
  getOrCreateChatRoom,
  sendMessage,
  listenToMessages,
  markMessagesAsRead,
} from '../../services/messageService';
import { COLORS } from '../../constants';

export default function ChatScreen() {
  const { providerId, roomId, otherName: passedName } = useLocalSearchParams();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [chatRoom, setChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const isProvider = userProfile?.role === 'provider';

  useEffect(() => {
    initChat();
  }, [providerId]);

  const initChat = async () => {
    try {
      if (passedName) {
        // Name passed from chats list — use it directly
        setOtherUser({ name: passedName, available: true });
      } else {
        // Opened from provider profile — get provider info
        const providerData = await getProviderById(providerId);
        setOtherUser(providerData);
      }

      if (user) {
        let room;

        if (roomId) {
          // Opened from chats list — use existing room directly
          room = { id: roomId, providerId };
        } else {
          // Opened from provider profile — customer initiating chat
          room = await getOrCreateChatRoom(user.uid, providerId);
        }

        setChatRoom(room);
        await markMessagesAsRead(room.id, user.uid);
      }
    } catch (error) {
      console.log('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chatRoom) return;

    const unsubscribe = listenToMessages(chatRoom.id, (msgs) => {
      setMessages(msgs);
      markMessagesAsRead(chatRoom.id, user.uid);
    });

    return () => unsubscribe();
  }, [chatRoom]);

  const handleSend = async () => {
    if (!input.trim() || !chatRoom || sending) return;

    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      await sendMessage(
        chatRoom.id,
        user.uid,
        userProfile?.name || 'User',
        text
      );
    } catch (error) {
      console.log('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatMsgTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const getMessagesWithHeaders = () => {
    const result = [];
    let lastDate = '';
    messages.forEach((msg) => {
      const msgDate = new Date(msg.sentAt).toDateString();
      if (msgDate !== lastDate) {
        result.push({ type: 'header', date: msg.sentAt, id: 'header_' + msgDate });
        lastDate = msgDate;
      }
      result.push({ type: 'message', ...msg });
    });
    return result;
  };

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateHeader}>
          <View style={styles.dateHeaderBg}>
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.date)}</Text>
          </View>
        </View>
      );
    }

    const isMe = item.senderId === user?.uid;

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
          {!isMe && (
            <Text style={styles.msgSender}>{item.senderName}</Text>
          )}
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
              {formatMsgTime(item.sentAt)}
            </Text>
            {isMe && (
              <Ionicons
                name={item.isRead ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.isRead ? '#53BDEB' : 'rgba(255,255,255,0.6)'}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const messagesWithHeaders = getMessagesWithHeaders();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" />

      {/* WhatsApp-style Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(otherUser?.name || 'U').charAt(0).toUpperCase()}
          </Text>
          <View style={[styles.onlineDot, { backgroundColor: otherUser?.available ? '#25D366' : COLORS.gray }]} />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{otherUser?.name || 'Chat'}</Text>
          <Text style={styles.headerStatus}>
            {otherUser?.available ? 'online' : 'offline'}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="call" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Chat Background */}
      <View style={styles.chatBg}>
        <FlatList
          ref={flatListRef}
          data={messagesWithHeaders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons name="chatbubbles" size={40} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Say hello to {otherUser?.name}!</Text>
            </View>
          }
        />
      </View>

      {/* WhatsApp-style Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.emojiBtn}>
            <Ionicons name="happy-outline" size={24} color={COLORS.gray} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message"
            value={input}
            onChangeText={setInput}
            placeholderTextColor={COLORS.gray}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="attach" size={24} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnMic]}
          onPress={input.trim() ? handleSend : null}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons
              name={input.trim() ? 'send' : 'mic'}
              size={20}
              color={COLORS.white}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header - WhatsApp green
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#075E54',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat background
  chatBg: {
    flex: 1,
    backgroundColor: '#ECE5DD',
  },

  // Date headers
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderBg: {
    backgroundColor: '#E1F3FB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A7A84',
  },

  // Messages
  messageList: {
    padding: 10,
    flexGrow: 1,
  },
  msgRow: {
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  msgRowMe: {
    alignItems: 'flex-end',
  },
  msgBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  msgBubbleMe: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 0,
    marginLeft: 50,
  },
  msgBubbleOther: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 0,
    marginRight: 50,
  },
  msgSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
    marginBottom: 2,
  },
  msgText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  msgTextMe: {
    color: COLORS.text,
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  msgTime: {
    fontSize: 11,
    color: '#8C9FA6',
  },
  msgTimeMe: {
    color: '#7DA87B',
  },

  // Empty
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 8,
  },
  emptyChatIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyChatText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyChatSub: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  // Input Bar - WhatsApp style
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 0,
    minHeight: 48,
  },
  emojiBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 8 : 10,
  },
  attachBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnMic: {
    backgroundColor: '#075E54',
  },
});
