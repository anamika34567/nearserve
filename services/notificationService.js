import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

// Create a notification
export const createNotification = async (userId, type, message, data = {}) => {
  const notification = {
    userId,
    type, // 'booking', 'chat', 'verification', 'system'
    message,
    data,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'notifications'), notification);
  return { id: docRef.id, ...notification };
};

// Get user's notifications
export const getUserNotifications = async (userId) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Listen to notifications in real-time
export const listenToNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(notifications);
  });
};

// Mark notification as read
export const markNotificationRead = async (notificationId) => {
  const docRef = doc(db, 'notifications', notificationId);
  await updateDoc(docRef, { isRead: true });
};

// Mark all notifications as read
export const markAllNotificationsRead = async (userId) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map((d) =>
    updateDoc(doc(db, 'notifications', d.id), { isRead: true })
  );
  await Promise.all(updates);
};

// Get unread count
export const getUnreadCount = async (userId) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};
