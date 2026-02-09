import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentLocation } from '../services/locationService';

const LocationContext = createContext({});

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
      } catch (error) {
        setErrorMsg(error.message);
      }
    })();
  }, []);

  const refreshLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      return loc;
    } catch (error) {
      setErrorMsg(error.message);
      return null;
    }
  };

  return (
    <LocationContext.Provider value={{ location, errorMsg, refreshLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
