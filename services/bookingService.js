import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../constants';
import { createNotification } from './notificationService';

export const createBooking = async (userId, providerId, userLat, userLng, scheduledAt = null, amount = 0, locationAddress = '') => {
  const booking = {
    userId,
    providerId,
    status: BOOKING_STATUS.REQUESTED,
    userLat,
    userLng,
    providerLat: null,
    providerLng: null,
    scheduledAt: scheduledAt || new Date().toISOString(),
    amount,
    locationAddress,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentMethod: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  const docRef = await addDoc(collection(db, 'bookings'), booking);

  // Notify provider
  await createNotification(
    providerId,
    'booking',
    'You have a new booking request!',
    { bookingId: docRef.id }
  );

  return { id: docRef.id, ...booking };
};

export const updateBookingStatus = async (bookingId, status, userId = null) => {
  const docRef = doc(db, 'bookings', bookingId);
  const updates = { status };
  if (status === BOOKING_STATUS.COMPLETED) {
    updates.completedAt = new Date().toISOString();
  }
  await updateDoc(docRef, updates);

  // Send notification to user
  if (userId) {
    let message = '';
    switch (status) {
      case BOOKING_STATUS.ACCEPTED:
        message = 'Your booking has been accepted!';
        break;
      case BOOKING_STATUS.REJECTED:
        message = 'Your booking was rejected. Try another provider.';
        break;
      case BOOKING_STATUS.EN_ROUTE:
        message = 'Your service provider is on the way!';
        break;
      case BOOKING_STATUS.ARRIVED:
        message = 'Your service provider has arrived!';
        break;
      case BOOKING_STATUS.COMPLETED:
        message = 'Your service has been completed!';
        break;
      case BOOKING_STATUS.CANCELLED:
        message = 'Your booking has been cancelled.';
        break;
    }
    if (message) {
      await createNotification(userId, 'booking', message, { bookingId });
    }
  }
};

export const updateBookingPayment = async (bookingId, paymentStatus, paymentMethod) => {
  const docRef = doc(db, 'bookings', bookingId);
  await updateDoc(docRef, { paymentStatus, paymentMethod });
};

export const updateBookingLocation = async (bookingId, userLat, userLng) => {
  const docRef = doc(db, 'bookings', bookingId);
  await updateDoc(docRef, { userLat, userLng });
};

export const updateProviderLocationInBooking = async (bookingId, providerLat, providerLng) => {
  const docRef = doc(db, 'bookings', bookingId);
  await updateDoc(docRef, { providerLat, providerLng });
};

export const getUserBookings = async (userId) => {
  const q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Get bookings for a provider (to accept/reject)
export const getProviderBookings = async (providerId) => {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId)
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Get all bookings (admin)
export const getAllBookings = async () => {
  const snapshot = await getDocs(collection(db, 'bookings'));
  const bookings = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Calculate provider earnings
export const getProviderEarnings = async (providerId) => {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId),
    where('status', '==', BOOKING_STATUS.COMPLETED)
  );
  const snapshot = await getDocs(q);
  const bookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const totalEarnings = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  return { totalEarnings, completedBookings: bookings.length, bookings };
};

export const listenToBooking = (bookingId, callback) => {
  const docRef = doc(db, 'bookings', bookingId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    }
  });
};

// Listen to provider bookings in real-time
export const listenToProviderBookings = (providerId, callback) => {
  const q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId)
  );
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    callback(bookings);
  });
};
