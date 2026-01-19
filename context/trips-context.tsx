import React, { createContext, useContext, useMemo, useState } from 'react';

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
}

interface TripsContextValue {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id'>) => Trip;
}

const TripsContext = createContext<TripsContextValue | undefined>(undefined);

export function TripsProvider({ children }: { children: React.ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);

  const value = useMemo<TripsContextValue>(() => {
    const addTrip: TripsContextValue['addTrip'] = (trip) => {
      const id = `${trip.destination}|${trip.startDate}|${trip.endDate}`;
      const newTrip: Trip = { id, ...trip };

      setTrips((prev) => {
        const exists = prev.some((t) => t.id === id);
        return exists ? prev : [newTrip, ...prev];
      });

      return newTrip;
    };

    return { trips, addTrip };
  }, [trips]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return ctx;
}
