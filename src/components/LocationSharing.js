import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindow } from '@react-google-maps/api';
import { ErrorBoundary } from 'react-error-boundary';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const libraries = ['places'];

function ErrorFallback({ error }) {
  return (
    <div>
      <h1>Something went wrong:</h1>
      <pre>{error.message}</pre>
    </div>
  )
}

function LocationSharing() {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [accuracyMode, setAccuracyMode] = useState('high');
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyPlace, setNearbyPlace] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

  useEffect(() => {
    if (isLoaded) {
      console.log('Google Maps API is loaded');
    } else {
      console.error('Google Maps API is not loaded');
    }
  }, [isLoaded]);

  useEffect(() => {
    console.log('nearbyPlace:', nearbyPlace);
  }, [nearbyPlace]);

  useEffect(() => {
    console.log('Component re-rendered. Current state:', {
      location,
      isLoaded,
      isLoading,
      error,
      nearbyPlace
    });
  });

  const getNearbyPlace = useCallback((lat, lng) => {
    console.log('getNearbyPlace called with:', lat, lng);
    if (!isLoaded) {
      console.log('Google Maps API not loaded yet');
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const request = {
      location: new window.google.maps.LatLng(lat, lng),
      rankBy: window.google.maps.places.RankBy.DISTANCE,
      types: ['point_of_interest']
    };

    console.log('Sending nearby search request:', request);

    service.nearbySearch(request, (results, status) => {
      console.log('Nearby search results:', results, 'Status:', status);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        console.log('Nearby place found:', results[0]);
        setNearbyPlace(results[0]);
      } else {
        console.error('Failed to fetch nearby place:', status);
        setNearbyPlace(null);
      }
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLoading(false);
      return;
    }

    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const lowAccuracyOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000
    };

    const successCallback = (position) => {
      console.log('Position:', position);
      const now = new Date();
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      console.log('New location:', newLocation);
      setLocation(newLocation);
      setLastUpdated(now);
      setIsLoading(false);
      getNearbyPlace(newLocation.latitude, newLocation.longitude);
    };

    const handleError = (error) => {
      if (error.code === error.TIMEOUT) {
        if (accuracyMode === 'high') {
          setAccuracyMode('low');
          setError('高精度モードでタイムアウトしました。低精度モードに切り替えます。');
        } else {
          setError('位置情報の取得に失敗しました。もう一度お試しください。');
        }
      } else {
        setError(`エラー: ${error.message}`);
      }
      setIsLoading(false);
    };

    const getCurrentPositionWithFallback = () => {
      const options = accuracyMode === 'high' ? highAccuracyOptions : lowAccuracyOptions;
      navigator.geolocation.getCurrentPosition(
        successCallback,
        (error) => {
          if (accuracyMode === 'high' && error.code === error.TIMEOUT) {
            setAccuracyMode('low');
            navigator.geolocation.getCurrentPosition(successCallback, handleError, lowAccuracyOptions);
          } else {
            handleError(error);
          }
        },
        options
      );
    };

    getCurrentPositionWithFallback();

    const watchId = navigator.geolocation.watchPosition(
      successCallback,
      handleError,
      accuracyMode === 'high' ? highAccuracyOptions : lowAccuracyOptions
    );

    const intervalId = setInterval(() => {
      getCurrentPositionWithFallback();
    }, 60000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [accuracyMode, getNearbyPlace]);

  if (loadError) {
    return <div>Error loading maps: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  if (isLoading) {
    return <p>位置情報を取得中...</p>;
  }

  if (error) {
    return <p>エラー: {error}</p>;
  }

  return (
    <div>
      <h2>お近くのチェックイン施設</h2>
      {location.latitude && location.longitude ? (
        <div>
          <p>緯度: {location.latitude}, 経度: {location.longitude}</p>
          <p>精度: {location.accuracy} メートル</p>
          <p>最終更新: {lastUpdated.toLocaleString()}</p>
          <p>精度モード: {accuracyMode === 'high' ? '高精度' : '低精度'}</p>
          {nearbyPlace && (
            <p>近くの場所: {nearbyPlace.name} ({nearbyPlace.types.join(', ')})</p>
          )}
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{ lat: location.latitude, lng: location.longitude }}
              zoom={15}
              onLoad={() => console.log('Map loaded')}
            >
              {console.log('Rendering map with center:', { lat: location.latitude, lng: location.longitude })}
              <MarkerF
                position={{ lat: location.latitude, lng: location.longitude }}
                onClick={() => setSelectedPlace(nearbyPlace)}
                icon={
                  isLoaded
                    ? {
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: 'red',
                      fillOpacity: 1,
                      strokeWeight: 0
                    }
                    : undefined
                }
                label={{
                  text: '',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              />
              {console.log('Marker position:', { lat: location.latitude, lng: location.longitude })}
              {selectedPlace && selectedPlace.geometry && (
                <InfoWindow
                  position={{
                    lat: selectedPlace.geometry.location.lat(),
                    lng: selectedPlace.geometry.location.lng()
                  }}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div style={{ minWidth: '200px', minHeight: '100px' }}>
                    <h3>{selectedPlace.name || 'No Name'}</h3>
                    <p>{selectedPlace.vicinity || 'No Address'}</p>
                  </div>
                </InfoWindow>
              )}
              {console.log('Marker position:', { lat: location.latitude, lng: location.longitude })}
            </GoogleMap>
          </ErrorBoundary>
        </div>
      ) : (
        <p>位置情報を取得できませんでした。</p>
      )}
    </div>
  );
}

export default LocationSharing;