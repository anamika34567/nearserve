import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateProviderRating } from './providerService';

export const addReview = async (providerId, userId, userName, rating, comment) => {
  const review = {
    providerId,
    userId,
    userName,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'reviews'), review);

  // Update provider's average rating
  const providerReviews = await getReviewsByProvider(providerId);
  const totalRating = providerReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = Math.round((totalRating / providerReviews.length) * 10) / 10;

  await updateProviderRating(providerId, avgRating, providerReviews.length);

  return { id: docRef.id, ...review };
};

export const getReviewsByProvider = async (providerId) => {
  const q = query(
    collection(db, 'reviews'),
    where('providerId', '==', providerId)
  );
  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const getReviewsByUser = async (userId) => {
  const q = query(
    collection(db, 'reviews'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  return reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
