/* 
Full Path: /src/context/GeolocationContext.tsx
Last Modified: 2025-02-28 17:40:00
*/

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { askGeolocationPermission } from '../geolocation';

export type LngLat = [number, number] | null;

export const GeolocationContext = createContext<LngLat>(null);

export const GeolocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<LngLat>(null);

  useEffect(() => {
    askGeolocationPermission()
      .then((pos) => {
        if (pos) {
          setLocation(pos);
        }
      })
      .catch((error) => {
        console.warn("Failed to get geolocation", error);
      });
  }, []);

  return (
    <GeolocationContext.Provider value={location}>
      {children}
    </GeolocationContext.Provider>
  );
};
