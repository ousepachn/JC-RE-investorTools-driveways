import * as dotenv from 'dotenv';
import { adminDb } from '../app/firebase/admin';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

interface DrivewayCurbcut {
  id?: string;
  address: string;
  date: string;
  street_name: string;
  street_no: string;
  street_initial: string;
  coordinates?: [number, number];
}

async function geocodeAddresses() {
  const addressesRef = adminDb.collection('addresses');
  
  try {
    // Get addresses without coordinates
    const snapshot = await addressesRef.where('coordinates', '==', null).get();
    
    console.log(`Found ${snapshot.docs.length} addresses to geocode`);
    
    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (doc) => {
        const address = doc.data() as DrivewayCurbcut;
        const coordinates = await getCoordinates(address.address);
        if (coordinates) {
          await doc.ref.update({ coordinates });
          console.log(`Successfully geocoded ${address.address} to [${coordinates.join(', ')}]`);
        } else {
          console.warn(`Failed to geocode ${address.address}`);
        }
      }));
      
      // Delay between batches to respect rate limits
      if (i + batchSize < snapshot.docs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Geocoding complete');
  } catch (error) {
    console.error('Error geocoding addresses:', error);
  }
}

async function getCoordinates(address: string): Promise<[number, number] | null> {
  try {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      throw new Error('Mapbox token not found in environment variables');
    }

    const query = encodeURIComponent(address + ', Jersey City, NJ');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].center as [number, number];
    }
    
    console.warn(`No results found for ${address}`);
    return null;
  } catch (error) {
    console.error(`Geocoding error for ${address}:`, error);
    return null;
  }
}

// Only run geocoding
geocodeAddresses().catch(console.error); 