import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Sample providers to seed into Firestore
const getSampleProviders = (userLat, userLng) => [
  {
    name: 'Rajesh Kumar',
    phone: '+911234567890',
    category: 'plumber',
    bio: 'Experienced plumber with 10+ years of service. Specializing in pipe repair, bathroom fitting, and water heater installation.',
    hourlyRate: 500,
    latitude: userLat + 0.005,
    longitude: userLng + 0.008,
    rating: 4.5,
    reviewCount: 23,
    available: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Suresh Electricals',
    phone: '+911234567891',
    category: 'electrician',
    bio: 'Licensed electrician handling wiring, fuse box repairs, fan installation, and switchboard work.',
    hourlyRate: 600,
    latitude: userLat - 0.008,
    longitude: userLng + 0.003,
    rating: 4.8,
    reviewCount: 45,
    available: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Quick Fix Plumbing',
    phone: '+911234567892',
    category: 'plumber',
    bio: 'Fast and reliable plumbing services. Emergency services available 24/7.',
    hourlyRate: 450,
    latitude: userLat + 0.012,
    longitude: userLng - 0.006,
    rating: 4.2,
    reviewCount: 18,
    available: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'PowerLine Solutions',
    phone: '+911234567893',
    category: 'electrician',
    bio: 'Professional electrical services including home wiring, inverter setup, and generator maintenance.',
    hourlyRate: 700,
    latitude: userLat - 0.003,
    longitude: userLng - 0.010,
    rating: 4.6,
    reviewCount: 32,
    available: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Amit Plumbing Works',
    phone: '+911234567894',
    category: 'plumber',
    bio: 'Affordable plumbing solutions for homes and offices. Drainage cleaning and kitchen sink repairs.',
    hourlyRate: 400,
    latitude: userLat + 0.018,
    longitude: userLng + 0.015,
    rating: 3.9,
    reviewCount: 12,
    available: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Bright Spark Electricals',
    phone: '+911234567895',
    category: 'electrician',
    bio: 'Expert in smart home wiring, CCTV installation, and electrical safety audits.',
    hourlyRate: 800,
    latitude: userLat - 0.015,
    longitude: userLng + 0.012,
    rating: 4.9,
    reviewCount: 56,
    available: true,
    createdAt: new Date().toISOString(),
  },
];

export const seedProviders = async (userLat = 17.385, userLng = 78.4867) => {
  try {
    // Check if providers already exist
    const existing = await getDocs(collection(db, 'providers'));
    if (existing.size > 0) {
      console.log('Providers already exist, skipping seed');
      return false;
    }

    const providers = getSampleProviders(userLat, userLng);
    for (const provider of providers) {
      await addDoc(collection(db, 'providers'), provider);
    }
    console.log('Seed data added successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
};
