export interface Address {
  id: number;
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  date: string;
  type: 'legal';
}

interface AddressInput {
  date: string;
  street_name: string;
  street_no: string;
  address: string;
}

// Helper function to get coordinates from Mapbox
async function getCoordinates(address: string): Promise<[number, number]> {
  try {
    const query = encodeURIComponent(address + ', Jersey City, NJ');
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
    );
    const data = await response.json();
    if (data.features && data.features[0]) {
      return data.features[0].center as [number, number];
    }
    console.warn(`Could not geocode address: ${address}`);
    return [-74.0776, 40.7282]; // Default to Jersey City center if not found
  } catch (error) {
    console.error('Geocoding error:', error);
    return [-74.0776, 40.7282]; // Default to Jersey City center on error
  }
}

// Sample data
const sampleData = {
  "results": [
    {"date": "1993-07-12", "street_name": "ACADEMY ST", "street_no": "250", "address": "250 ACADEMY ST"},
    {"date": "2013-04-04", "street_name": "ACADEMY ST", "street_no": "312", "address": "312 ACADEMY ST"},
    {"date": "2021-08-27", "street_name": "APOLLO ST", "street_no": "11", "address": "11 APOLLO ST"},
    {"date": "1994-04-14", "street_name": "ARLINGTON AVE", "street_no": "400", "address": "400 ARLINGTON AVE"},
    {"date": "1994-04-14", "street_name": "ARLINGTON AVE", "street_no": "223", "address": "223 ARLINGTON AVE"},
    {"date": "2000-10-17", "street_name": "ARLINGTON AVE", "street_no": "246", "address": "246 ARLINGTON AVE"},
    {"date": "1991-03-25", "street_name": "ARLINGTON AVE", "street_no": "171", "address": "171 ARLINGTON AVE"}
  ]
};

// Function to load and geocode addresses
export async function loadAddresses(): Promise<Address[]> {
  try {
    // In a real app, you might fetch this data from an API
    const data = sampleData;
    
    // Process addresses in batches to avoid rate limiting
    const batchSize = 5;
    const results: Address[] = [];
    
    for (let i = 0; i < data.results.length; i += batchSize) {
      const batch = data.results.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item: AddressInput, index: number) => {
        const coordinates = await getCoordinates(item.address);
        return {
          id: i + index + 1,
          address: item.address,
          coordinates,
          date: item.date,
          type: 'legal' as const
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add a small delay between batches to respect rate limits
      if (i + batchSize < data.results.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error loading addresses:', error);
    return [];
  }
}

// Initial data with placeholder coordinates
export const addresses: Address[] = sampleData.results.map((item, index) => ({
  id: index + 1,
  address: item.address,
  coordinates: [-74.0776, 40.7282], // Default coordinates until geocoded
  date: item.date,
  type: 'legal'
})); 