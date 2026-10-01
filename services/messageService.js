import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// Create or get a chat room between user and provider
export const getOrCreateChatRoom = async (userId, providerId) => {
  // Check if chat room already exists
  const q = query(
    collection(db, 'chatRooms'),
    where('userId', '==', userId),
    where('providerId', '==', providerId)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const room = snapshot.docs[0];
    return { id: room.id, ...room.data() };
  }

  // Create new chat room
  const chatRoom = {
    userId,
    providerId,
    lastMessage: '',
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'chatRooms'), chatRoom);
  return { id: docRef.id, ...chatRoom };
};

// Send a message
export const sendMessage = async (chatRoomId, senderId, senderName, content) => {
  const message = {
    chatRoomId,
    senderId,
    senderName,
    content,
    isRead: false,
    sentAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'messages'), message);

  // Update chat room's last message
  const roomRef = doc(db, 'chatRooms', chatRoomId);
  await updateDoc(roomRef, {
    lastMessage: content,
    lastMessageAt: new Date().toISOString(),
  });

  return { id: docRef.id, ...message };
};

// Listen to messages in a chat room (real-time)
export const listenToMessages = (chatRoomId, callback) => {
  const q = query(
    collection(db, 'messages'),
    where('chatRoomId', '==', chatRoomId)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
    callback(messages);
  });
};

// Mark messages as read
export const markMessagesAsRead = async (chatRoomId, userId) => {
  const q = query(
    collection(db, 'messages'),
    where('chatRoomId', '==', chatRoomId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);

  const updates = snapshot.docs
    .filter((d) => d.data().senderId !== userId)
    .map((d) => updateDoc(doc(db, 'messages', d.id), { isRead: true }));

  await Promise.all(updates);
};

// Get user's chat rooms
export const getUserChatRooms = async (userId) => {
  const q = query(
    collection(db, 'chatRooms'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
};

// Get provider's chat rooms
export const getProviderChatRooms = async (providerId) => {
  const q = query(
    collection(db, 'chatRooms'),
    where('providerId', '==', providerId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
};
