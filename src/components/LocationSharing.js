import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const libraries = ['places'];

function LocationSharing() {

  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [accuracyMode, setAccuracyMode] = useState('high');
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyPlace, setNearbyPlace] = useState(null);

  const getNearbyPlace = useCallback((lat, lng) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps API is not loaded');
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const request = {
      location: new window.google.maps.LatLng(lat, lng),
      rankBy: window.google.maps.places.RankBy.DISTANCE,
      types: ['point_of_interest']
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        setNearbyPlace(results[0]);
      } else {
        console.error('Failed to fetch nearby place:', status);
        setNearbyPlace(null);
      }
    });
  }, []);

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
      const now = new Date();
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
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

  if (isLoading) {
    return <p>位置情報を取得中...</p>;
  }

  if (error) {
    return <p>エラー: {error}</p>;
  }

  return (
    <div>
      <h2>位置情報共有</h2>
      {location.latitude && location.longitude ? (
        <div>
          <p>緯度: {location.latitude}, 経度: {location.longitude}</p>
          <p>精度: {location.accuracy} メートル</p>
          <p>最終更新: {lastUpdated.toLocaleString()}</p>
          <p>精度モード: {accuracyMode === 'high' ? '高精度' : '低精度'}</p>
          {nearbyPlace && (
            <p>近くの場所: {nearbyPlace.name} ({nearbyPlace.types.join(', ')})</p>
          )}
          <LoadScript
            googleMapsApiKey="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            libraries={libraries}
            onLoad={() => getNearbyPlace(location.latitude, location.longitude)}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{lat: location.latitude, lng: location.longitude}}
              zoom={15}
            >
              <Marker position={{lat: location.latitude, lng: location.longitude}} />
              {nearbyPlace && (
                <InfoWindow position={{lat: nearbyPlace.geometry.location.lat(), lng: nearbyPlace.geometry.location.lng()}}>
                  <div>
                    <h3>{nearbyPlace.name}</h3>
                    <p>{nearbyPlace.vicinity}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>
      ) : (
        <p>位置情報を取得できませんでした。</p>
      )}
    </div>
  );
}

export default LocationSharing;