import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

// Get all users
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

// Ban/unban a user
export const toggleUserBan = async (userId, isBanned) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, { isBanned });
};

// Get system reports/stats
export const getSystemReports = async () => {
  const [usersSnap, providersSnap, bookingsSnap, reviewsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'providers')),
    getDocs(collection(db, 'bookings')),
    getDocs(collection(db, 'reviews')),
  ]);

  const bookings = bookingsSnap.docs.map((d) => d.data());
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);

  const providers = providersSnap.docs.map((d) => d.data());
  const verifiedProviders = providers.filter((p) => p.isVerified);

  return {
    totalUsers: usersSnap.size,
    totalProviders: providersSnap.size,
    verifiedProviders: verifiedProviders.length,
    unverifiedProviders: providersSnap.size - verifiedProviders.length,
    totalBookings: bookingsSnap.size,
    completedBookings: completedBookings.length,
    totalReviews: reviewsSnap.size,
    totalRevenue,
  };
};

// Remove fake listing / provider
export const removeFakeListing = async (providerId) => {
  // Remove provider
  await deleteDoc(doc(db, 'providers', providerId));

  // Remove associated reviews
  const reviewsQ = query(
    collection(db, 'reviews'),
    where('providerId', '==', providerId)
  );
  const reviewsSnap = await getDocs(reviewsQ);
  const deletePromises = reviewsSnap.docs.map((d) =>
    deleteDoc(doc(db, 'reviews', d.id))
  );
  await Promise.all(deletePromises);
};

// Get all reviews
export const getAllReviews = async () => {
  const snapshot = await getDocs(collection(db, 'reviews'));
  const reviews = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

// Get all complaints
export const getAllComplaints = async () => {
  const snapshot = await getDocs(collection(db, 'complaints'));
  const complaints = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return complaints.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

// Add a complaint
export const addComplaint = async (complaint) => {
  const docRef = await addDoc(collection(db, 'complaints'), {
    ...complaint,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  return { id: docRef.id };
};

// Resolve a complaint
export const resolveComplaint = async (complaintId) => {
  await updateDoc(doc(db, 'complaints', complaintId), {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
};

// Update user role
export const updateUserRole = async (userId, role) => {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, { role });
};
