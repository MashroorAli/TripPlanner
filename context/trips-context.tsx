import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
}

export interface ItineraryEvent {
  id: string;
  name: string;
  time: string;
  location?: string;
}

export interface ItineraryDay {
  id: string;
  label: string;
  events: ItineraryEvent[];
}

export interface FlightInfo {
  departureDate: string;
  departureTime: string;
  airline?: string;
  flightNumber?: string;
  from?: string;
  to?: string;
}

interface TripsContextValue {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id'>) => Trip;
  flightByTripId: Record<string, FlightInfo | undefined>;
  setFlightInfo: (tripId: string, flight: FlightInfo) => void;
  clearFlightInfo: (tripId: string) => void;
  itineraryByTripId: Record<string, ItineraryDay[]>;
  addItineraryDay: (tripId: string, label: string) => ItineraryDay;
  addItineraryEvent: (tripId: string, dayId: string, name: string, time: string, location?: string) => ItineraryEvent;
  updateItineraryDay: (tripId: string, dayId: string, label: string) => void;
  deleteItineraryDay: (tripId: string, dayId: string) => void;
  updateItineraryEvent: (
    tripId: string,
    dayId: string,
    eventId: string,
    updates: { name: string; time: string; location?: string }
  ) => void;
  deleteItineraryEvent: (tripId: string, dayId: string, eventId: string) => void;
}

const TripsContext = createContext<TripsContextValue | undefined>(undefined);

const getTripsStorageKey = (userKey: string) => `tripplanner:data:${userKey}`;

type PersistedTripsState = {
  trips: Trip[];
  flightByTripId: Record<string, FlightInfo | undefined>;
  itineraryByTripId: Record<string, ItineraryDay[]>;
};

type TripsProviderProps = {
  children: React.ReactNode;
  userKey: string | null;
};

export function TripsProvider({ children, userKey }: TripsProviderProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [flightByTripId, setFlightByTripId] = useState<Record<string, FlightInfo | undefined>>({});
  const [itineraryByTripId, setItineraryByTripId] = useState<Record<string, ItineraryDay[]>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!userKey) {
        setTrips([]);
        setFlightByTripId({});
        setItineraryByTripId({});
        setIsHydrated(true);
        return;
      }

      setIsHydrated(false);
      try {
        const raw = await AsyncStorage.getItem(getTripsStorageKey(userKey));
        if (cancelled) return;

        if (!raw) {
          setTrips([]);
          setFlightByTripId({});
          setItineraryByTripId({});
          return;
        }

        const parsed = JSON.parse(raw) as Partial<PersistedTripsState>;
        setTrips(Array.isArray(parsed.trips) ? parsed.trips : []);
        setFlightByTripId(parsed.flightByTripId && typeof parsed.flightByTripId === 'object' ? parsed.flightByTripId : {});
        setItineraryByTripId(
          parsed.itineraryByTripId && typeof parsed.itineraryByTripId === 'object' ? parsed.itineraryByTripId : {}
        );
      } catch {
        if (cancelled) return;
        setTrips([]);
        setFlightByTripId({});
        setItineraryByTripId({});
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [userKey]);

  useEffect(() => {
    if (!userKey) return;
    if (!isHydrated) return;

    const persist = async () => {
      const nextState: PersistedTripsState = {
        trips,
        flightByTripId,
        itineraryByTripId,
      };
      await AsyncStorage.setItem(getTripsStorageKey(userKey), JSON.stringify(nextState));
    };

    persist();
  }, [flightByTripId, itineraryByTripId, isHydrated, trips, userKey]);

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

    const setFlightInfo: TripsContextValue['setFlightInfo'] = (tripId, flight) => {
      setFlightByTripId((prev) => ({
        ...prev,
        [tripId]: {
          departureDate: flight.departureDate.trim(),
          departureTime: flight.departureTime.trim(),
          airline: flight.airline?.trim() ? flight.airline.trim() : undefined,
          flightNumber: flight.flightNumber?.trim() ? flight.flightNumber.trim() : undefined,
          from: flight.from?.trim() ? flight.from.trim() : undefined,
          to: flight.to?.trim() ? flight.to.trim() : undefined,
        },
      }));
    };

    const clearFlightInfo: TripsContextValue['clearFlightInfo'] = (tripId) => {
      setFlightByTripId((prev) => ({ ...prev, [tripId]: undefined }));
    };

    const addItineraryDay: TripsContextValue['addItineraryDay'] = (tripId, label) => {
      const currentCount = itineraryByTripId[tripId]?.length ?? 0;
      const createdDay: ItineraryDay = {
        id: `day-${Date.now()}`,
        label: label.trim() ? label.trim() : `Day ${currentCount + 1}`,
        events: [],
      };

      setItineraryByTripId((prev) => {
        const currentDays = prev[tripId] ?? [];
        return {
          ...prev,
          [tripId]: [...currentDays, createdDay],
        };
      });

      return createdDay;
    };

    const addItineraryEvent: TripsContextValue['addItineraryEvent'] = (tripId, dayId, name, time, location) => {
      const createdEvent: ItineraryEvent = {
        id: `event-${Date.now()}`,
        name,
        time,
        location,
      };

      setItineraryByTripId((prev) => {
        const currentDays = prev[tripId] ?? [];
        const nextDays = currentDays.map((day) => {
          if (day.id !== dayId) return day;
          return {
            ...day,
            events: [...day.events, createdEvent],
          };
        });
        return {
          ...prev,
          [tripId]: nextDays,
        };
      });

      return createdEvent;
    };

    const updateItineraryDay: TripsContextValue['updateItineraryDay'] = (tripId, dayId, label) => {
      setItineraryByTripId((prev) => {
        const currentDays = prev[tripId] ?? [];
        const nextLabel = label.trim();
        const nextDays = currentDays.map((day) => (day.id === dayId ? { ...day, label: nextLabel || day.label } : day));
        return { ...prev, [tripId]: nextDays };
      });
    };

    const deleteItineraryDay: TripsContextValue['deleteItineraryDay'] = (tripId, dayId) => {
      setItineraryByTripId((prev) => {
        const currentDays = prev[tripId] ?? [];
        const nextDays = currentDays.filter((day) => day.id !== dayId);
        return { ...prev, [tripId]: nextDays };
      });
    };

    const updateItineraryEvent: TripsContextValue['updateItineraryEvent'] = (tripId, dayId, eventId, updates) => {
      setItineraryByTripId((prev) => {
        const currentDays = prev[tripId] ?? [];
        const nextDays = currentDays.map((day) => {
          if (day.id !== dayId) return day;
          const nextEvents = day.events.map((e) => {
            if (e.id !== eventId) return e;
            const nextName = updates.name.trim();
            const nextTime = updates.time.trim();
            const nextLocation = updates.location?.trim();
            return {
              ...e,
              name: nextName || e.name,
              time: nextTime || e.time,
              location: nextLocation ? nextLocation : undefined,
            };
          });
          return { ...day, events: nextEvents };
        });
        return { ...prev, [tripId]: nextDays };
      });
    };

    const deleteItineraryEvent: TripsContextValue['deleteItineraryEvent'] = (tripId, dayId, eventId) => {
      setItineraryByTripId((prev) => {
        const currentDays = prev[tripId] ?? [];
        const nextDays = currentDays.map((day) => {
          if (day.id !== dayId) return day;
          return { ...day, events: day.events.filter((e) => e.id !== eventId) };
        });
        return { ...prev, [tripId]: nextDays };
      });
    };

    return {
      trips,
      addTrip,
      flightByTripId,
      setFlightInfo,
      clearFlightInfo,
      itineraryByTripId,
      addItineraryDay,
      addItineraryEvent,
      updateItineraryDay,
      deleteItineraryDay,
      updateItineraryEvent,
      deleteItineraryEvent,
    };
  }, [flightByTripId, itineraryByTripId, trips]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) {
    throw new Error('useTrips must be used within a TripsProvider');
  }
  return ctx;
}
