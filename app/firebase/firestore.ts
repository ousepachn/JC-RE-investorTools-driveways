import { db } from './config';
import { collection, addDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import drivewayData from '../data/zoning-driveways-and-carports.json';

export interface DrivewayCurbcut {
  id?: string;
  address: string;
  date: string;
  street_name: string;
  street_no: string;
  street_initial: string;
  coordinates?: [number, number];
}

// Function to batch upload addresses
export async function uploadAddressesToFirestore() {
  const addressesRef = collection(db, 'addresses');
  
  try {
    // Check if data already exists
    const snapshot = await getDocs(addressesRef);
    if (!snapshot.empty) {
      console.log('Data already exists in Firestore');
      return;
    }

    // Upload in batches
    const batchSize = 500;
    for (let i = 0; i < drivewayData.length; i += batchSize) {
      const batch = drivewayData.slice(i, i + batchSize);
      const promises = batch.map(address => 
        addDoc(addressesRef, {
          ...address,
          coordinates: null // Will be populated later
        })
      );
      await Promise.all(promises);
      console.log(`Uploaded batch ${i/batchSize + 1}`);
    }
    
    console.log('Upload complete');
  } catch (error) {
    console.error('Error uploading addresses:', error);
  }
}

// Function to geocode addresses that don't have coordinates
export async function geocodeAddresses() {
  const addressesRef = collection(db, 'addresses');
  
  try {
    // Get addresses without coordinates
    const q = query(addressesRef, where('coordinates', '==', null));
    const snapshot = await getDocs(q);
    
    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize);
      
      for (const doc of batch) {
        const address = doc.data() as DrivewayCurbcut;
        const coordinates = await getCoordinates(address.address);
        
        // Update document with coordinates
        await updateDoc(doc.ref, { coordinates });
        
        console.log(`Geocoded ${address.address}`);
      }
      
      // Delay between batches
      if (i + batchSize < snapshot.docs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Geocoding complete');
  } catch (error) {
    console.error('Error geocoding addresses:', error);
  }
}

// Function to get coordinates from Mapbox
async function getCoordinates(address: string): Promise<[number, number] | null> {
  try {
    const query = encodeURIComponent(address + ', Jersey City, NJ');
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
    );
    const data = await response.json();
    
    if (data.features && data.features[0]) {
      return data.features[0].center as [number, number];
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Function to fetch addresses with coordinates
export async function fetchAddressesWithCoordinates(): Promise<DrivewayCurbcut[]> {
  try {
    const addressesRef = collection(db, 'addresses');
    const q = query(addressesRef, where('coordinates', '!=', null));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DrivewayCurbcut));
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
} 