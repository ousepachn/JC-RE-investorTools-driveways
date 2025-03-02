'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { fetchInitialAddresses, searchAddresses } from './firebase/firestore';
import type { MapRef } from 'react-map-gl';
import { Map as MapGL } from 'react-map-gl';

// Define the type that matches our Firestore data
interface DrivewayCurbcut {
  id?: string;
  address: string;
  date: string;
  street_name: string;
  street_no: string;
  street_initial: string;
  coordinates?: [number, number];
}

// Remove unused MapComponent and only keep what we use
const Markers = dynamic(() => import('react-map-gl').then((mod) => mod.Marker), {
  ssr: false
});

const PopupComponent = dynamic(() => import('react-map-gl').then((mod) => mod.Popup), {
  ssr: false
});

// Update the constant at the top level
const INITIAL_DISPLAY_COUNT = 25;

export default function Home() {
  const [popupInfo, setPopupInfo] = useState<DrivewayCurbcut | null>(null);
  const [addressData, setAddressData] = useState<DrivewayCurbcut[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load initial 25 random addresses
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { addresses, total } = await fetchInitialAddresses(INITIAL_DISPLAY_COUNT);
        setAddressData(addresses);
        setTotalCount(total);
        setError(null);
      } catch (err) {
        console.error('Error loading addresses:', err);
        setError('Failed to load addresses. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Handle search and show all
  useEffect(() => {
    async function handleSearch() {
      if (!searchQuery && !showAll) return;
      
      setLoading(true);
      try {
        const addresses = await searchAddresses(searchQuery, showAll);
        setAddressData(addresses);
      } catch (err) {
        console.error('Error searching addresses:', err);
        setError('Failed to search addresses. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    const debounceTimer = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, showAll]);

  // Update map reference with proper type
  const mapRef = useRef<MapRef>(null);

  // Handle result click with proper typing
  const handleResultClick = (address: DrivewayCurbcut) => {
    setSearchQuery(address.address);
    setShowSearchResults(false);
    if (address.coordinates && mapRef.current) {
      mapRef.current.flyTo({
        center: [address.coordinates[0], address.coordinates[1]],
        zoom: 16
      });
      setPopupInfo(address);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl">Loading addresses...</p>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">
      <p className="text-xl text-red-600">{error}</p>
    </div>;
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="w-full p-4 bg-white shadow-md">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900">
          Jersey City, Legal Driveway and Curbcut Tracker
        </h1>
        
        <div className="flex items-center justify-between max-w-3xl mx-auto gap-4">
          {/* Search Box with Dropdown */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by street name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {addressData.length > 0 ? (
                  addressData.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => handleResultClick(address)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                    >
                      <div className="text-gray-900 font-medium">{address.address}</div>
                      <div className="text-gray-600 text-sm">
                        Approved: {new Date(address.date).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-600">No matches found</div>
                )}
              </div>
            )}
          </div>
          
          {/* Toggle Switch */}
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={() => setShowAll(!showAll)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-900">Show All ({totalCount} addresses)</span>
          </div>
        </div>
        
        {/* Display count of filtered results */}
        <div className="text-center mt-2 text-sm font-medium text-gray-700">
          Showing {addressData.length} addresses
          {searchQuery && ` matching "${searchQuery}"`}
          {!searchQuery && !showAll && ` (randomly selected from ${totalCount} total)`}
        </div>
      </div>

      <div className="w-full h-[calc(100vh-12rem)]">
        <MapGL
          ref={mapRef}
          initialViewState={{
            longitude: -74.0776,
            latitude: 40.7282,
            zoom: 13
          }}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          style={{width: '100%', height: '100%'}}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          reuseMaps
        >
          {addressData.map((address) => (
            <Markers
              key={address.id}
              longitude={address.coordinates?.[0] ?? -74.0776}
              latitude={address.coordinates?.[1] ?? 40.7282}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(address);
              }}
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                {address.street_no}
              </div>
            </Markers>
          ))}

          {popupInfo && popupInfo.coordinates && (
            <PopupComponent
              anchor="top"
              longitude={popupInfo.coordinates[0]}
              latitude={popupInfo.coordinates[1]}
              onClose={() => setPopupInfo(null)}
              closeButton={true}
              closeOnClick={false}
              className="custom-popup"
            >
              <div className="p-3 min-w-[200px]">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{popupInfo.address}</h3>
                <p className="text-sm font-medium text-gray-800">
                  Approved: {new Date(popupInfo.date).toLocaleDateString()}
                </p>
              </div>
            </PopupComponent>
          )}
        </MapGL>
      </div>

      {/* Click outside handler to close search results */}
      {showSearchResults && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setShowSearchResults(false)}
        />
      )}

      {/* Add footer */}
      <footer className="w-full py-4 text-center text-sm text-gray-600 mt-4">
        Created by{' '}
        <a 
          href="mailto:jcvdev@gmail.com"
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          jcvdev@gmail.com
        </a>
      </footer>
    </main>
  );
}
