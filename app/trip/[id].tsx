import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTrips } from '@/context/trips-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CachedHeroImages = {
  fetchedAt: number;
  urls: string[];
  lastIndex?: number;
};

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  const {
    trips,
    flightsByTripId,
    addFlight,
    updateFlight,
    deleteFlight,
    itineraryByTripId,
    addItineraryDay,
    addItineraryEvent,
    updateItineraryDay,
    deleteItineraryDay,
    updateItineraryEvent,
    deleteItineraryEvent,
    expensesByTripId,
    addExpense,
    updateExpense,
    deleteExpense,
    journalByTripId,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
  } = useTrips();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'finances' | 'journal' | 'photos'>('overview');

  const trip = id ? trips.find((t) => t.id === id) : undefined;
  const tripId = id;
  const flights = tripId ? flightsByTripId[tripId] ?? [] : [];
  const itineraryDays = tripId ? itineraryByTripId[tripId] ?? [] : [];
  const expenses = tripId ? expensesByTripId[tripId] ?? [] : [];
  const journalEntries = tripId ? journalByTripId[tripId] ?? [] : [];
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const selectedDay = selectedDayId ? itineraryDays.find((d) => d.id === selectedDayId) : undefined;

  const [editMode, setEditMode] = useState(false);

  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayName, setDayName] = useState('');
  const [editingDayId, setEditingDayId] = useState<string | null>(null);

  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventError, setEventError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [flightModalVisible, setFlightModalVisible] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [flightSegment, setFlightSegment] = useState<'auto' | 'going' | 'mid' | 'return'>('auto');
  const [flightDepartureDate, setFlightDepartureDate] = useState('');
  const [flightDepartureTime, setFlightDepartureTime] = useState('');
  const [flightArrivalDate, setFlightArrivalDate] = useState('');
  const [flightArrivalTime, setFlightArrivalTime] = useState('');
  const [flightAirline, setFlightAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightFrom, setFlightFrom] = useState('');
  const [flightFromCity, setFlightFromCity] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightToCity, setFlightToCity] = useState('');
  const [flightLookupAirlineQuery, setFlightLookupAirlineQuery] = useState('');
  const [flightLookupAirlineIata, setFlightLookupAirlineIata] = useState('');
  const [flightLookupFlightNumber, setFlightLookupFlightNumber] = useState('');
  const [flightLookupDate, setFlightLookupDate] = useState('');
  const [flightLookupLoading, setFlightLookupLoading] = useState(false);
  const [flightManualMode, setFlightManualMode] = useState(false);
  const [flightLookupDatePickerVisible, setFlightLookupDatePickerVisible] = useState(false);
  const [flightLookupDraftDate, setFlightLookupDraftDate] = useState<Date>(new Date());
  const [flightError, setFlightError] = useState<string | null>(null);

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState('USD');
  const [expenseName, setExpenseName] = useState('');
  const [expenseIsSplit, setExpenseIsSplit] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [journalDate, setJournalDate] = useState('');
  const [journalText, setJournalText] = useState('');
  const [journalError, setJournalError] = useState<string | null>(null);

  const PEXELS_API_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY;
  const heroCacheTtlMs = 1000 * 60 * 60 * 24 * 7;
  const [heroDisplayedUrl, setHeroDisplayedUrl] = useState<string | null>(null);
  const [heroNextUrl, setHeroNextUrl] = useState<string | null>(null);
  const heroNextOpacity = useRef(new Animated.Value(0)).current;
  const heroDisplayedUrlRef = useRef<string | null>(null);

  const shuffleUrls = (items: string[]) => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  };

  const scrollY = useRef(new Animated.Value(0)).current;
  const heroMaxHeight = Math.round(Dimensions.get('window').height / 3);
  const heroMinHeight = 124;
  const bottomElasticSpace = Math.max(180, heroMaxHeight - heroMinHeight + 24);
  const heroHeight = scrollY.interpolate({
    inputRange: [0, Math.max(0, heroMaxHeight - heroMinHeight)],
    outputRange: [heroMaxHeight, heroMinHeight],
    extrapolate: 'clamp',
  });
  const [editingJournalEntryId, setEditingJournalEntryId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollLayoutHeightRef = useRef(0);
  const scrollContentHeightRef = useRef(0);
  const snappingRef = useRef(false);

  const snapBackIfNeeded = (offsetY: number) => {
    if (snappingRef.current) return;
    const layoutH = scrollLayoutHeightRef.current;
    const contentH = scrollContentHeightRef.current;
    if (!layoutH || !contentH) return;

    const maxOffset = Math.max(0, contentH - layoutH);
    const snapOffset = Math.max(0, maxOffset - bottomElasticSpace);
    if (offsetY <= snapOffset + 0.5) return;

    snappingRef.current = true;
    scrollRef.current?.scrollTo({ y: snapOffset, animated: true });
    setTimeout(() => {
      snappingRef.current = false;
    }, 350);
  };

  const fetchHeroImagesForDestination = async (destination: string) => {
    if (!PEXELS_API_KEY) return [] as string[];

    const query = `${destination} travel landscape landmarks`;
    const page = Math.floor(Math.random() * 3) + 1;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15&page=${page}&orientation=landscape`;

    const res = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!res.ok) return [] as string[];
    const json = (await res.json()) as any;
    const photos = Array.isArray(json?.photos) ? json.photos : [];

    return photos
      .map((p: any) => p?.src?.large2x ?? p?.src?.large ?? p?.src?.original)
      .filter((u: any): u is string => typeof u === 'string' && !!u.trim())
      .slice(0, 15);
  };

  useFocusEffect(
    useCallback(() => {
      let canceled = false;

      const run = async () => {
        const destination = trip?.destination?.trim();
        if (!destination) return;

        if (heroNextUrl) return;

        const cacheKey = `heroImages:${destination.toLowerCase()}`;
        const now = Date.now();
        let cached: CachedHeroImages | null = null;
        let urls: string[] = [];
        let nextIndex = 0;

        try {
          const raw = await AsyncStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw) as CachedHeroImages;
            if (
              parsed &&
              typeof parsed.fetchedAt === 'number' &&
              Array.isArray(parsed.urls) &&
              now - parsed.fetchedAt < heroCacheTtlMs
            ) {
              cached = {
                fetchedAt: parsed.fetchedAt,
                urls: parsed.urls.filter((u) => typeof u === 'string' && !!u.trim()),
                lastIndex: typeof parsed.lastIndex === 'number' ? parsed.lastIndex : undefined,
              };
              urls = cached.urls;
            }
          }
        } catch {
          cached = null;
          urls = [];
        }

        if (urls.length > 0 && urls.length < 10) {
          try {
            const fetched = await fetchHeroImagesForDestination(destination);
            const merged = Array.from(new Set([...urls, ...fetched].filter((u) => typeof u === 'string' && !!u.trim())));
            const selected = merged.length > 10 ? shuffleUrls(merged).slice(0, 10) : shuffleUrls(merged);
            urls = selected;
            cached = { fetchedAt: cached?.fetchedAt ?? now, urls, lastIndex: cached?.lastIndex };
            await AsyncStorage.setItem(
              cacheKey,
              JSON.stringify({ fetchedAt: cached.fetchedAt, urls, lastIndex: cached.lastIndex } satisfies CachedHeroImages),
            );
          } catch {
            // ignore
          }
        }

        if (urls.length > 10) {
          urls = shuffleUrls(urls).slice(0, 10);
          cached = { fetchedAt: cached?.fetchedAt ?? now, urls, lastIndex: cached?.lastIndex };
          try {
            await AsyncStorage.setItem(
              cacheKey,
              JSON.stringify({ fetchedAt: cached.fetchedAt, urls, lastIndex: cached.lastIndex } satisfies CachedHeroImages),
            );
          } catch {
            // ignore
          }
        }

        if (urls.length > 0) {
          let nextUrls = urls;
          let lastIndex = cached?.lastIndex;
          if (typeof lastIndex === 'number' && lastIndex >= nextUrls.length - 1) {
            nextUrls = shuffleUrls(nextUrls);
            lastIndex = -1;
          }

          nextIndex = typeof lastIndex === 'number' ? (lastIndex + 1) % nextUrls.length : 0;

          let nextUrl = nextUrls[nextIndex];
          const currentDisplayed = heroDisplayedUrlRef.current;
          if (nextUrl && currentDisplayed && nextUrls.length > 1 && nextUrl === currentDisplayed) {
            const altIndex = (nextIndex + 1) % nextUrls.length;
            nextIndex = altIndex;
            nextUrl = nextUrls[nextIndex];
          }
          if (!nextUrl) return;

          try {
            await ExpoImage.prefetch(nextUrl);
          } catch {
            return;
          }

          if (canceled) return;
          if (!heroDisplayedUrl) {
            heroDisplayedUrlRef.current = nextUrl;
            setHeroDisplayedUrl(nextUrl);
          } else {
            heroNextOpacity.setValue(0);
            setHeroNextUrl(nextUrl);
          }

          try {
            await AsyncStorage.setItem(
              cacheKey,
              JSON.stringify({ fetchedAt: cached?.fetchedAt ?? now, urls: nextUrls, lastIndex: nextIndex } satisfies CachedHeroImages),
            );
          } catch {
            // ignore
          }

          return;
        }

        if (urls.length === 0) {
          try {
            const fetched = await fetchHeroImagesForDestination(destination);
            const selected = fetched.length > 10 ? shuffleUrls(fetched).slice(0, 10) : shuffleUrls(fetched);
            urls = selected;
            if (urls.length > 0) {
              const firstUrl = urls[0];
              if (firstUrl) {
                try {
                  await ExpoImage.prefetch(firstUrl);
                } catch {
                  // ignore
                }
              }

              if (!canceled && firstUrl) {
                if (!heroDisplayedUrl) {
                  heroDisplayedUrlRef.current = firstUrl;
                  setHeroDisplayedUrl(firstUrl);
                } else {
                  heroNextOpacity.setValue(0);
                  setHeroNextUrl(firstUrl);
                }
              }

              await AsyncStorage.setItem(
                cacheKey,
                JSON.stringify({ fetchedAt: now, urls, lastIndex: 0 } satisfies CachedHeroImages),
              );
            }
          } catch {
            urls = [];
          }
        }
      };

      run();
      return () => {
        canceled = true;
      };
    }, [heroCacheTtlMs, trip?.destination, PEXELS_API_KEY, heroNextUrl]),
  );

  const getTodayIsoDate = () => new Date().toISOString().slice(0, 10);

  const formatParamDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  function parseFlightDateTime(date: string, time: string) {
    const dateObj = parseTripDate(date);
    if (!dateObj) return undefined;
    const value = time.trim();
    const ampm = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const t24 = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

    let hours = 0;
    let minutes = 0;
    if (ampm) {
      hours = Number(ampm[1]);
      minutes = Number(ampm[2]);
      const ap = ampm[3].toUpperCase();
      if (ap === 'PM' && hours < 12) hours += 12;
      if (ap === 'AM' && hours === 12) hours = 0;
    } else if (t24) {
      hours = Number(t24[1]);
      minutes = Number(t24[2]);
    } else {
      return undefined;
    }

    const dt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hours, minutes, 0, 0);
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt;
  }

  const parseTripDay = (value?: string) => {
    const dt = parseTripDate(value);
    if (!dt) return undefined;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  };

  const inferFlightSegment = (flight: { departureDate: string }) => {
    const start = parseTripDay(trip?.startDate);
    const end = parseTripDay(trip?.endDate);
    const dep = parseTripDay(flight.departureDate);
    if (!start || !end || !dep) return 'mid' as const;

    if (dep.getTime() <= start.getTime()) return 'going' as const;
    if (dep.getTime() >= end.getTime()) return 'return' as const;
    return 'mid' as const;
  };

  const getEffectiveFlightSegment = (flight: { segment?: 'auto' | 'going' | 'mid' | 'return'; departureDate: string }) => {
    if (flight.segment && flight.segment !== 'auto') return flight.segment;
    return inferFlightSegment({ departureDate: flight.departureDate });
  };

  const sortFlightsForDisplay = <T extends { departureDate: string; departureTime: string }>(items: T[]) => {
    const now = new Date();
    const upcoming = items
      .filter((f) => {
        const dt = parseFlightDateTime(f.departureDate, f.departureTime);
        return dt ? dt.getTime() >= now.getTime() : false;
      })
      .slice()
      .sort((a, b) => {
        const adt = parseFlightDateTime(a.departureDate, a.departureTime)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bdt = parseFlightDateTime(b.departureDate, b.departureTime)?.getTime() ?? Number.POSITIVE_INFINITY;
        return adt - bdt;
      });

    const past = items
      .filter((f) => {
        const dt = parseFlightDateTime(f.departureDate, f.departureTime);
        return dt ? dt.getTime() < now.getTime() : true;
      })
      .slice()
      .sort((a, b) => {
        const adt = parseFlightDateTime(a.departureDate, a.departureTime)?.getTime() ?? Number.NEGATIVE_INFINITY;
        const bdt = parseFlightDateTime(b.departureDate, b.departureTime)?.getTime() ?? Number.NEGATIVE_INFINITY;
        return bdt - adt;
      });

    return [...upcoming, ...past];
  };

  const formatTime12h = (time?: string) => {
    if (!time) return '';
    const value = time.trim();
    const ampm = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampm) return `${Number(ampm[1])}:${ampm[2]} ${ampm[3].toUpperCase()}`;
    const t24 = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!t24) return value;
    let h = Number(t24[1]);
    const m = t24[2];
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ap}`;
  };

  const formatFlightDayLine = (flight: {
    departureDate: string;
    departureTime: string;
    arrivalTime?: string;
  }) => {
    const dt = parseTripDate(flight.departureDate);
    if (!dt) return '';
    const dow = dt.toLocaleDateString(undefined, { weekday: 'short' });
    const mon = dt.toLocaleDateString(undefined, { month: 'short' });
    const day = dt.getDate();
    const dep = formatTime12h(flight.departureTime);
    const arr = flight.arrivalTime ? formatTime12h(flight.arrivalTime) : '';
    return arr ? `${dow}, ${mon} ${day} ${dep} — ${arr}` : `${dow}, ${mon} ${day} ${dep}`;
  };

  const openExpenseModal = (expense?: { id: string; name: string; amount: number; currency: string; isSplit: boolean }) => {
    if (expense) {
      setEditingExpenseId(expense.id);
      setExpenseAmount(String(expense.amount));
      setExpenseCurrency(expense.currency);
      setExpenseName(expense.name);
      setExpenseIsSplit(expense.isSplit);
    } else {
      setEditingExpenseId(null);
      setExpenseAmount('');
      setExpenseCurrency('USD');
      setExpenseName('');
      setExpenseIsSplit(false);
    }
    setExpenseError(null);
    setExpenseModalVisible(true);
  };

  const openJournalModal = (entry?: { id: string; date: string; text: string }) => {
    if (entry) {
      setEditingJournalEntryId(entry.id);
      setJournalDate(entry.date);
      setJournalText(entry.text);
    } else {
      setEditingJournalEntryId(null);
      setJournalDate(getTodayIsoDate());
      setJournalText('');
    }
    setJournalError(null);
    setJournalModalVisible(true);
  };

  const openFlightModal = (existing?: {
    id: string;
    segment?: 'auto' | 'going' | 'mid' | 'return';
    departureDate: string;
    departureTime: string;
    arrivalDate?: string;
    arrivalTime?: string;
    airline?: string;
    flightNumber?: string;
    from?: string;
    fromCity?: string;
    to?: string;
    toCity?: string;
  }) => {
    setEditingFlightId(existing?.id ?? null);
    setFlightSegment(existing?.segment ?? 'auto');
    setFlightDepartureDate(existing?.departureDate ?? '');
    setFlightDepartureTime(existing?.departureTime ?? '');
    setFlightArrivalDate(existing?.arrivalDate ?? '');
    setFlightArrivalTime(existing?.arrivalTime ?? '');
    setFlightAirline(existing?.airline ?? '');
    setFlightNumber(existing?.flightNumber ?? '');
    setFlightFrom(existing?.from ?? '');
    setFlightFromCity(existing?.fromCity ?? '');
    setFlightTo(existing?.to ?? '');
    setFlightToCity(existing?.toCity ?? '');

    setFlightLookupAirlineQuery(existing?.airline ?? '');
    setFlightLookupAirlineIata('');
    setFlightLookupFlightNumber(existing?.flightNumber ? existing.flightNumber.replace(/[^0-9]/g, '') : '');
    setFlightLookupDate(existing?.departureDate ?? '');
    setFlightLookupLoading(false);
    setFlightManualMode(false);
    const initialLookupDate = parseTripDate(existing?.departureDate);
    setFlightLookupDraftDate(initialLookupDate ?? new Date());
    setFlightLookupDatePickerVisible(false);
    setFlightError(null);
    setFlightModalVisible(true);
  };

  const FLIGHTAPI_KEY = process.env.EXPO_PUBLIC_FLIGHTAPI_KEY;

  const formatDateLabel = (isoDate?: string) => {
    if (!isoDate) return '';
    const dt = parseTripDate(isoDate);
    if (!dt) return '';
    return dt.toLocaleDateString();
  };

  const toLocalIsoDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const toFlightApiDateParam = (isoDate: string) => isoDate.replace(/-/g, '');

  const airlineOptions = [
    { name: 'American Airlines', iata: 'AA' },
    { name: 'Delta Air Lines', iata: 'DL' },
    { name: 'United Airlines', iata: 'UA' },
    { name: 'Southwest Airlines', iata: 'WN' },
    { name: 'JetBlue', iata: 'B6' },
    { name: 'Alaska Airlines', iata: 'AS' },
    { name: 'Air Canada', iata: 'AC' },
    { name: 'British Airways', iata: 'BA' },
    { name: 'Lufthansa', iata: 'LH' },
    { name: 'Air France', iata: 'AF' },
    { name: 'KLM', iata: 'KL' },
    { name: 'Emirates', iata: 'EK' },
    { name: 'Qatar Airways', iata: 'QR' },
    { name: 'Turkish Airlines', iata: 'TK' },
    { name: 'Singapore Airlines', iata: 'SQ' },
    { name: 'Cathay Pacific', iata: 'CX' },
    { name: 'ANA', iata: 'NH' },
    { name: 'Japan Airlines', iata: 'JL' },
    { name: 'Ryanair', iata: 'FR' },
    { name: 'easyJet', iata: 'U2' },
    { name: 'Vueling', iata: 'VY' },
    { name: 'Iberia', iata: 'IB' },
    { name: 'TAP Air Portugal', iata: 'TP' },
    { name: 'Aer Lingus', iata: 'EI' },
    { name: 'Spirit Airlines', iata: 'NK' },
    { name: 'Frontier Airlines', iata: 'F9' },
    { name: 'Avianca', iata: 'AV' },
    { name: 'LATAM', iata: 'LA' },
    { name: 'VivaAerobus', iata: 'VB' },
    { name: 'IndiGo', iata: '6E' },
  ];

  const lookupFlightDetails = async () => {
    if (!FLIGHTAPI_KEY) {
      setFlightError('Missing flight API key. Set EXPO_PUBLIC_FLIGHTAPI_KEY and try again.');
      return;
    }

    const date = flightLookupDate.trim();
    const airlineIataFromQuery = flightLookupAirlineQuery.toUpperCase().match(/\b[A-Z0-9]{2,3}\b/)?.[0] ?? '';
    const airlineIata = (flightLookupAirlineIata || airlineIataFromQuery).toUpperCase();
    const flightNumOnly = flightLookupFlightNumber.replace(/[^0-9]/g, '');

    if (!airlineIata || !flightNumOnly || !date) {
      setFlightError('Please enter an airline, flight number, and flight day (YYYY-MM-DD).');
      return;
    }

    setFlightLookupLoading(true);
    setFlightError(null);

    try {
      const dateParam = toFlightApiDateParam(date);
      const url = `https://api.flightapi.io/airline/${encodeURIComponent(FLIGHTAPI_KEY)}?num=${encodeURIComponent(
        String(flightNumOnly),
      )}&name=${encodeURIComponent(airlineIata)}&date=${encodeURIComponent(dateParam)}`;

      const res = await fetch(url);
      const json = (await res.json()) as any;

      if (!res.ok) {
        const message = typeof json?.message === 'string' ? json.message : undefined;
        setFlightError(`Flight lookup error: ${message ?? 'Request failed.'}`);
        return;
      }

      if (!Array.isArray(json) || json.length === 0) {
        setFlightError('No matching flight found. Double-check the airline, flight number, and date.');
        return;
      }

      // Response may be an array with separate departure/arrival objects.
      const departure = (json.find((x: any) => x?.departure)?.departure ?? json[0]?.departure) as any | undefined;
      const arrival = (json.find((x: any) => x?.arrival)?.arrival ?? json[1]?.arrival) as any | undefined;

      const depDateTime: string | undefined =
        departure?.departureDateTime ?? departure?.scheduledDateTime ?? departure?.estimatedDateTime;
      const arrDateTime: string | undefined = arrival?.arrivalDateTime ?? arrival?.scheduledDateTime ?? arrival?.estimatedDateTime;

      const datePart = typeof depDateTime === 'string' ? depDateTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] : undefined;
      const timePart = typeof depDateTime === 'string' ? depDateTime.match(/T(\d{2}:\d{2})/)?.[1] : undefined;
      const arrDatePart = typeof arrDateTime === 'string' ? arrDateTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] : undefined;
      const arrTimePart = typeof arrDateTime === 'string' ? arrDateTime.match(/T(\d{2}:\d{2})/)?.[1] : undefined;

      if (datePart) setFlightDepartureDate(datePart);
      if (timePart) setFlightDepartureTime(timePart);
      if (arrDatePart) setFlightArrivalDate(arrDatePart);
      if (arrTimePart) setFlightArrivalTime(arrTimePart);

      // FlightAPI response doesn't consistently include airline name; use what the user selected.
      setFlightAirline(flightLookupAirlineQuery.trim() ? flightLookupAirlineQuery.trim() : airlineIata);
      setFlightNumber(`${airlineIata}${flightNumOnly}`);

      const fromCode = departure?.airportCode;
      const toCode = arrival?.airportCode;
      if (typeof fromCode === 'string' && fromCode.trim()) setFlightFrom(fromCode.trim());
      if (typeof toCode === 'string' && toCode.trim()) setFlightTo(toCode.trim());

      const fromCity = departure?.airportCity;
      const toCity = arrival?.airportCity;
      if (typeof fromCity === 'string' && fromCity.trim()) setFlightFromCity(fromCity.trim());
      if (typeof toCity === 'string' && toCity.trim()) setFlightToCity(toCity.trim());

      if (!datePart || !timePart || !fromCode || !toCode) {
        setFlightError('Found the flight, but some details were missing. Use “Edit details” to confirm/fill in.');
      }
    } catch (_e) {
      setFlightError('Flight lookup failed. Please try again.');
    } finally {
      setFlightLookupLoading(false);
    }
  };

  const parseTripDate = (value?: string) => {
    if (!value) return undefined;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = Number(match[1]);
      const m = Number(match[2]);
      const d = Number(match[3]);
      const date = new Date(y, m - 1, d);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    return undefined;
  };

  const getDaysUntilTrip = (start?: string) => {
    const startDateObj = parseTripDate(start);
    if (!startDateObj) return 0;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfTrip = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
    const diffMs = startOfTrip.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'itinerary' as const, label: 'Itinerary' },
    { key: 'finances' as const, label: 'Finances' },
    { key: 'journal' as const, label: 'Journal' },
    { key: 'photos' as const, label: 'Photos' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        const sortedFlights = sortFlightsForDisplay(flights);
        const grouped = sortedFlights.reduce(
          (acc, f) => {
            const seg = getEffectiveFlightSegment(f);
            acc[seg].push(f);
            return acc;
          },
          { going: [] as typeof sortedFlights, mid: [] as typeof sortedFlights, return: [] as typeof sortedFlights }
        );

        const countdownBase = sortedFlights[0]?.departureDate ?? trip?.startDate;
        const daysUntilTrip = getDaysUntilTrip(countdownBase);
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Trip Overview</ThemedText>
            <ThemedText style={styles.countdownText}>
              {daysUntilTrip === 1 ? 'You fly out tomorrow!' : `There are ${daysUntilTrip} days until the trip!`}
            </ThemedText>

            <ThemedView style={[styles.flightCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.flightHeaderRow}>
                <ThemedText style={styles.flightTitle}>Flights</ThemedText>
                <Pressable
                  style={styles.flightAddIconButton}
                  onPress={() => {
                    openFlightModal();
                  }}>
                  <IconSymbol name="plus" size={18} color={colors.primary} />
                </Pressable>
              </View>

              {sortedFlights.length > 0 ? (
                <View style={styles.flightsList}>
                  {([
                    { key: 'going' as const, label: 'Going there' },
                    { key: 'mid' as const, label: 'Mid trip' },
                    { key: 'return' as const, label: 'Return back' },
                  ] as const)
                    .filter((section) => grouped[section.key].length > 0)
                    .map((section) => (
                      <View key={section.key} style={styles.flightSectionBlock}>
                        <ThemedText style={styles.flightSectionTitle}>{section.label}</ThemedText>
                        <View style={styles.flightSectionList}>
                          {grouped[section.key].map((f) => (
                            <View
                              key={f.id}
                              style={[styles.flightItem, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
                              <View style={styles.flightRouteRow}>
                                <View style={styles.flightAirportBlock}>
                                  <ThemedText style={styles.flightAirportCode}>{f.from ?? '—'}</ThemedText>
                                  <ThemedText style={styles.flightAirportCity}>{f.fromCity ?? ''}</ThemedText>
                                </View>

                                <ThemedText style={[styles.flightArrow, { color: colors.primary }]}>→</ThemedText>

                                <View style={[styles.flightAirportBlock, styles.flightAirportBlockRight]}>
                                  <ThemedText style={styles.flightAirportCode}>{f.to ?? '—'}</ThemedText>
                                  <ThemedText style={styles.flightAirportCity}>{f.toCity ?? ''}</ThemedText>
                                </View>
                              </View>

                              <ThemedText style={styles.flightTimeLine}>
                                {formatFlightDayLine({
                                  departureDate: f.departureDate,
                                  departureTime: f.departureTime,
                                  arrivalTime: f.arrivalTime,
                                })}
                              </ThemedText>

                              {editMode ? (
                                <View style={styles.flightItemActions}>
                                  <Pressable
                                    style={styles.inlineActionButton}
                                    onPress={() => {
                                      openFlightModal(f);
                                    }}>
                                    <ThemedText style={[styles.inlineActionText, { color: colors.primary }]}>Edit</ThemedText>
                                  </Pressable>

                                  <Pressable
                                    style={styles.inlineActionButton}
                                    onPress={() => {
                                      if (!tripId) return;
                                      Alert.alert('Remove flight?', 'This cannot be undone.', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Remove', style: 'destructive', onPress: () => deleteFlight(tripId, f.id) },
                                      ]);
                                    }}>
                                    <ThemedText
                                      style={[
                                        styles.inlineActionText,
                                        styles.destructiveText,
                                        { color: colors.destructive },
                                      ]}>
                                      Remove
                                    </ThemedText>
                                  </Pressable>
                                </View>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                </View>
              ) : (
                <ThemedText style={styles.emptyText}>No flights added yet.</ThemedText>
              )}
            </ThemedView>

            <Modal visible={flightModalVisible} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, styles.flightModalCard, { backgroundColor: colors.surface }]}
                >
                  <ScrollView
                    style={styles.modalScroll}
                    contentContainerStyle={styles.modalScrollContent}
                    keyboardShouldPersistTaps="handled">
                    <ThemedText style={styles.modalTitle}>{editingFlightId ? 'Edit Flight' : 'Add Flight'}</ThemedText>

                    <ThemedText style={styles.modalSubtitle}>Flight type</ThemedText>
                    <View style={styles.flightSegmentRow}>
                      {([
                        { key: 'auto' as const, label: 'Auto' },
                        { key: 'going' as const, label: 'Going' },
                        { key: 'mid' as const, label: 'Mid' },
                        { key: 'return' as const, label: 'Return' },
                      ] as const).map((opt) => {
                        const active = flightSegment === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            style={[
                              styles.flightSegmentOption,
                              { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                              active ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
                            ]}
                            onPress={() => setFlightSegment(opt.key)}>
                            <ThemedText
                              style={[
                                styles.flightSegmentOptionText,
                                active ? { color: '#fff' } : { color: colors.inputText },
                              ]}>
                              {opt.label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>

                    <ThemedText style={styles.modalSubtitle}>Flight lookup</ThemedText>
                    <TextInput
                      value={flightLookupAirlineQuery}
                      onChangeText={(value) => {
                        setFlightLookupAirlineQuery(value);
                        setFlightLookupAirlineIata('');
                      }}
                      placeholder="Airline (search or enter IATA code like DL)"
                      placeholderTextColor="#888"
                      autoCapitalize="words"
                      style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                    />

                    {flightLookupAirlineQuery.trim().length ? (
                      <View style={[styles.airlineResults, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
                        {airlineOptions
                          .filter(
                            (a) =>
                              a.name.toLowerCase().includes(flightLookupAirlineQuery.trim().toLowerCase()) ||
                              a.iata.toLowerCase().includes(flightLookupAirlineQuery.trim().toLowerCase()),
                          )
                          .slice(0, 8)
                          .map((a) => (
                            <Pressable
                              key={a.iata}
                              style={styles.airlineResultItem}
                              onPress={() => {
                                setFlightLookupAirlineQuery(`${a.name} (${a.iata})`);
                                setFlightLookupAirlineIata(a.iata);
                              }}>
                              <ThemedText style={styles.airlineResultText}>{`${a.name} (${a.iata})`}</ThemedText>
                            </Pressable>
                          ))}
                      </View>
                    ) : null}

                    <TextInput
                      value={flightLookupFlightNumber}
                      onChangeText={setFlightLookupFlightNumber}
                      placeholder="Flight number (e.g., 1234)"
                      placeholderTextColor="#888"
                      autoCapitalize="characters"
                      style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                    />

                    <Pressable
                      onPress={() => {
                        const current = parseTripDate(flightLookupDate);
                        setFlightLookupDraftDate(current ?? new Date());
                        setFlightLookupDatePickerVisible(true);
                      }}
                      style={[styles.dateSelectButton, { borderColor: colors.border }]}>
                      <ThemedText style={[styles.dateSelectButtonText, { color: colors.inputText }]}>
                        {flightLookupDate ? formatDateLabel(flightLookupDate) : 'Flight day'}
                      </ThemedText>
                    </Pressable>

                    <Modal
                      visible={flightLookupDatePickerVisible}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setFlightLookupDatePickerVisible(false)}>
                      <View style={styles.datePickerBackdrop}>
                        <View style={[styles.datePickerCard, { backgroundColor: colors.surface }]}
                        >
                          <View style={styles.datePickerHeader}>
                            <Pressable
                              onPress={() => setFlightLookupDatePickerVisible(false)}
                              style={styles.datePickerHeaderButton}>
                              <ThemedText style={[styles.datePickerHeaderButtonText, { color: colors.primary }]}
                              >
                                Cancel
                              </ThemedText>
                            </Pressable>

                            <ThemedText style={styles.datePickerTitle}>Flight day</ThemedText>

                            <Pressable
                              onPress={() => {
                                setFlightLookupDate(toLocalIsoDate(flightLookupDraftDate));
                                setFlightLookupDatePickerVisible(false);
                              }}
                              style={styles.datePickerHeaderButton}>
                              <ThemedText style={[styles.datePickerHeaderButtonText, { color: colors.primary }]}
                              >
                                Done
                              </ThemedText>
                            </Pressable>
                          </View>

                          <DateTimePicker
                            value={flightLookupDraftDate}
                            mode="date"
                            display="spinner"
                            onChange={(_event: DateTimePickerEvent, date?: Date) => {
                              if (date instanceof Date && !Number.isNaN(date.getTime())) {
                                setFlightLookupDraftDate(date);
                              }
                            }}
                          />
                        </View>
                      </View>
                    </Modal>

                    <View style={styles.flightLookupActions}>
                      <Pressable
                        style={[
                          styles.modalButton,
                          styles.modalPrimaryButton,
                          { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={lookupFlightDetails}
                        disabled={flightLookupLoading}>
                        <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>
                          {flightLookupLoading ? 'Looking up…' : 'Lookup'}
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        style={[styles.modalButton, { borderColor: colors.border }]}
                        onPress={() => {
                          setFlightLookupAirlineQuery('');
                          setFlightLookupAirlineIata('');
                          setFlightLookupFlightNumber('');
                          setFlightLookupDate('');
                          setFlightError(null);
                        }}>
                        <ThemedText style={styles.modalButtonText}>Clear</ThemedText>
                      </Pressable>

                      <Pressable
                        style={[styles.modalButton, { borderColor: colors.border }]}
                        onPress={() => {
                          setFlightManualMode((v) => !v);
                        }}>
                        <ThemedText style={styles.modalButtonText}>{flightManualMode ? 'Hide' : 'Edit details'}</ThemedText>
                      </Pressable>
                    </View>

                    {!flightManualMode ? (
                      <View
                        style={[
                          styles.flightLookupSummary,
                          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
                        ]}
                      >
                        <ThemedText style={styles.flightLookupSummaryLine}>
                          Departure: {flightDepartureDate || '—'} {flightDepartureTime || ''}
                        </ThemedText>
                        <ThemedText style={styles.flightLookupSummaryLine}>
                          Arrival: {flightArrivalDate || '—'} {flightArrivalTime || ''}
                        </ThemedText>
                        <ThemedText style={styles.flightLookupSummaryLine}>Airline: {flightAirline || '—'}</ThemedText>
                        <ThemedText style={styles.flightLookupSummaryLine}>Flight: {flightNumber || '—'}</ThemedText>
                        <ThemedText style={styles.flightLookupSummaryLine}>From: {flightFrom || '—'} {flightFromCity ? `(${flightFromCity})` : ''}</ThemedText>
                        <ThemedText style={styles.flightLookupSummaryLine}>To: {flightTo || '—'} {flightToCity ? `(${flightToCity})` : ''}</ThemedText>
                      </View>
                    ) : (
                      <>
                        <TextInput
                          value={flightDepartureDate}
                          onChangeText={setFlightDepartureDate}
                          placeholder="Departure date (YYYY-MM-DD)"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightDepartureTime}
                          onChangeText={setFlightDepartureTime}
                          placeholder="Departure time (HH:MM)"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightArrivalDate}
                          onChangeText={setFlightArrivalDate}
                          placeholder="Arrival date (YYYY-MM-DD)"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightArrivalTime}
                          onChangeText={setFlightArrivalTime}
                          placeholder="Arrival time (HH:MM)"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightAirline}
                          onChangeText={setFlightAirline}
                          placeholder="Airline"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightNumber}
                          onChangeText={setFlightNumber}
                          placeholder="Flight number"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightFrom}
                          onChangeText={setFlightFrom}
                          placeholder="From"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightFromCity}
                          onChangeText={setFlightFromCity}
                          placeholder="From city (optional)"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightTo}
                          onChangeText={setFlightTo}
                          placeholder="To"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />

                        <TextInput
                          value={flightToCity}
                          onChangeText={setFlightToCity}
                          placeholder="To city (optional)"
                          placeholderTextColor="#888"
                          style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                        />
                      </>
                    )}

                    {flightError ? <ThemedText style={styles.modalErrorText}>{flightError}</ThemedText> : null}

                    <View style={styles.modalActions}>
                      <Pressable
                        style={[styles.modalButton, { borderColor: colors.border }]}
                        onPress={() => {
                          setFlightModalVisible(false);
                          setFlightError(null);
                          setEditingFlightId(null);
                          setFlightSegment('auto');
                        }}>
                        <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.modalButton,
                          styles.modalPrimaryButton,
                          { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          if (!tripId) return;
                          const depDate = flightDepartureDate.trim();
                          const depTime = flightDepartureTime.trim();
                          if (!depDate || !depTime) {
                            setFlightError('Departure date and time are required.');
                            return;
                          }
                          const payload = {
                            segment: flightSegment,
                            departureDate: depDate,
                            departureTime: depTime,
                            arrivalDate: flightArrivalDate.trim() ? flightArrivalDate.trim() : undefined,
                            arrivalTime: flightArrivalTime.trim() ? flightArrivalTime.trim() : undefined,
                            airline: flightAirline.trim() ? flightAirline.trim() : undefined,
                            flightNumber: flightNumber.trim() ? flightNumber.trim() : undefined,
                            from: flightFrom.trim() ? flightFrom.trim() : undefined,
                            fromCity: flightFromCity.trim() ? flightFromCity.trim() : undefined,
                            to: flightTo.trim() ? flightTo.trim() : undefined,
                            toCity: flightToCity.trim() ? flightToCity.trim() : undefined,
                          };

                          if (editingFlightId) {
                            updateFlight(tripId, editingFlightId, payload);
                          } else {
                            addFlight(tripId, payload);
                          }
                          setFlightModalVisible(false);
                          setFlightError(null);
                          setEditingFlightId(null);
                          setFlightSegment('auto');
                        }}>
                        <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</ThemedText>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </ThemedView>
        );
      case 'itinerary':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Itinerary</ThemedText>
            {!tripId ? (
              <ThemedText>Trip not found.</ThemedText>
            ) : selectedDay ? (
              <ThemedView style={styles.itineraryContainer}>
                <View style={styles.itineraryTopRow}>
                  <Pressable
                    style={styles.itineraryBackButton}
                    onPress={() => {
                      setSelectedDayId(null);
                    }}>
                    <ThemedText style={[styles.itineraryBackText, { color: colors.primary }]}>← Days</ThemedText>
                  </Pressable>
                </View>

                <ThemedText style={styles.itineraryDayTitle}>{selectedDay.label}</ThemedText>

                {selectedDay.events.length > 0 ? (
                  <ScrollView style={styles.eventsList} contentContainerStyle={styles.eventsListContent}>
                    {selectedDay.events
                      .slice()
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((e) => (
                        <ThemedView
                          key={e.id}
                          style={[styles.eventCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                          <View style={styles.eventHeaderRow}>
                            <ThemedText style={styles.eventName}>{e.name}</ThemedText>

                            {editMode ? (
                              <View style={styles.inlineActionsRow}>
                                <Pressable
                                  style={styles.inlineActionButton}
                                  onPress={() => {
                                    setEditingEventId(e.id);
                                    setEventName(e.name);
                                    setEventTime(e.time);
                                    setEventLocation(e.location ?? '');
                                    setEventError(null);
                                    setEventModalVisible(true);
                                  }}>
                                  <ThemedText style={[styles.inlineActionText, { color: colors.primary }]}>Edit</ThemedText>
                                </Pressable>

                                <Pressable
                                  style={styles.inlineActionButton}
                                  onPress={() => {
                                    if (!tripId || !selectedDayId) return;
                                    Alert.alert('Delete event?', 'This cannot be undone.', [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () => deleteItineraryEvent(tripId, selectedDayId, e.id),
                                      },
                                    ]);
                                  }}>
                                  <ThemedText
                                    style={[styles.inlineActionText, styles.destructiveText, { color: colors.destructive }]}
                                  >
                                    Delete
                                  </ThemedText>
                                </Pressable>
                              </View>
                            ) : null}
                          </View>
                          <ThemedText style={styles.eventMeta}>Time: {e.time}</ThemedText>
                          {e.location ? <ThemedText style={styles.eventMeta}>Location: {e.location}</ThemedText> : null}
                        </ThemedView>
                      ))}
                  </ScrollView>
                ) : (
                  <ThemedText style={styles.emptyText}>No events yet.</ThemedText>
                )}

                <Modal visible={eventModalVisible} transparent animationType="fade">
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                      <ThemedText style={styles.modalTitle}>{editingEventId ? 'Edit Event' : 'Add Event'}</ThemedText>

                      <TextInput
                        value={eventName}
                        onChangeText={setEventName}
                        placeholder="Name"
                        placeholderTextColor="#888"
                        style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                      />

                      <TextInput
                        value={eventTime}
                        onChangeText={setEventTime}
                        placeholder="Time (e.g., 9:00 AM)"
                        placeholderTextColor="#888"
                        style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                      />

                      <TextInput
                        value={eventLocation}
                        onChangeText={setEventLocation}
                        placeholder="Location (optional)"
                        placeholderTextColor="#888"
                        style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                      />

                      {eventError ? <ThemedText style={styles.modalErrorText}>{eventError}</ThemedText> : null}

                      <View style={styles.modalActions}>
                        <Pressable
                          style={[styles.modalButton, { borderColor: colors.border }]}
                          onPress={() => {
                            setEventModalVisible(false);
                            setEventName('');
                            setEventTime('');
                            setEventLocation('');
                            setEventError(null);
                            setEditingEventId(null);
                          }}>
                          <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.modalButton,
                            styles.modalPrimaryButton,
                            { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => {
                            if (!tripId || !selectedDayId) return;
                            const name = eventName.trim();
                            const time = eventTime.trim();
                            const location = eventLocation.trim();

                            if (!name || !time) {
                              setEventError('Name and time are required.');
                              return;
                            }

                            if (editingEventId) {
                              updateItineraryEvent(tripId, selectedDayId, editingEventId, {
                                name,
                                time,
                                location: location ? location : undefined,
                              });
                            } else {
                              addItineraryEvent(tripId, selectedDayId, name, time, location ? location : undefined);
                            }

                            setEventModalVisible(false);
                            setEventName('');
                            setEventTime('');
                            setEventLocation('');
                            setEventError(null);
                            setEditingEventId(null);
                          }}>
                          <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>
              </ThemedView>
            ) : (
              <ThemedView style={styles.itineraryContainer}>
                <Modal visible={dayModalVisible} transparent animationType="fade">
                  <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                      <ThemedText style={styles.modalTitle}>{editingDayId ? 'Edit Day' : 'Add Day'}</ThemedText>

                      <TextInput
                        value={dayName}
                        onChangeText={setDayName}
                        placeholder="Day name"
                        placeholderTextColor="#888"
                        style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                      />

                      <View style={styles.modalActions}>
                        <Pressable
                          style={[styles.modalButton, { borderColor: colors.border }]}
                          onPress={() => {
                            setDayModalVisible(false);
                            setDayName('');
                            setEditingDayId(null);
                          }}>
                          <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.modalButton,
                            styles.modalPrimaryButton,
                            { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                          onPress={() => {
                            if (!tripId) return;
                            const label = dayName.trim();

                            if (editingDayId) {
                              updateItineraryDay(tripId, editingDayId, label);
                              setDayModalVisible(false);
                              setDayName('');
                              setEditingDayId(null);
                              return;
                            }

                            const day = addItineraryDay(tripId, label);
                            setDayModalVisible(false);
                            setDayName('');
                            setEditingDayId(null);
                            setSelectedDayId(day.id);
                          }}>
                          <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>

                {itineraryDays.length > 0 ? (
                  itineraryDays.map((day) => (
                    <Pressable
                      key={day.id}
                      style={[styles.dayCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      onPress={() => {
                        if (!editMode) setSelectedDayId(day.id);
                      }}>
                      <View style={styles.dayCardHeaderRow}>
                        <ThemedText style={styles.dayCardTitle}>{day.label}</ThemedText>

                        {editMode ? (
                          <View style={styles.inlineActionsRow}>
                            <Pressable
                              style={styles.inlineActionButton}
                              onPress={() => {
                                setEditingDayId(day.id);
                                setDayName(day.label);
                                setDayModalVisible(true);
                              }}>
                              <ThemedText style={styles.inlineActionText}>Edit</ThemedText>
                            </Pressable>

                            <Pressable
                              style={styles.inlineActionButton}
                              onPress={() => {
                                if (!tripId) return;
                                Alert.alert('Delete day?', 'All events in this day will be removed.', [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => {
                                      deleteItineraryDay(tripId, day.id);
                                      if (selectedDayId === day.id) setSelectedDayId(null);
                                    },
                                  },
                                ]);
                              }}>
                              <ThemedText style={[styles.inlineActionText, styles.destructiveText]}>Delete</ThemedText>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>

                      <ThemedText style={styles.dayCardSubtitle}>{day.events.length} events</ThemedText>
                    </Pressable>
                  ))
                ) : (
                  <ThemedText>Your days will appear here.</ThemedText>
                )}
              </ThemedView>
            )}
          </ThemedView>
        );
      case 'finances':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Finances</ThemedText>

            <ThemedView
              style={[
                styles.financesTotalCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}>
              <ThemedText style={styles.financesTotalLabel}>Total</ThemedText>
              <ThemedText numberOfLines={2} style={styles.financesTotalValue}>
                {(() => {
                  const totalsByCurrency = expenses.reduce<Record<string, number>>((acc, expense) => {
                    const currency = expense.currency || 'USD';
                    acc[currency] = (acc[currency] ?? 0) + expense.amount;
                    return acc;
                  }, {});

                  const parts = Object.entries(totalsByCurrency)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`);

                  return parts.length ? parts.join(' | ') : '0';
                })()}
              </ThemedText>
            </ThemedView>

            {expenses.length > 0 ? (
              <ThemedView style={styles.financesList}>
                {expenses.map((e) => (
                  <Pressable
                    key={e.id}
                    style={[styles.financeCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={() => {
                      if (!editMode) return;
                      openExpenseModal({
                        id: e.id,
                        name: e.name,
                        amount: e.amount,
                        currency: e.currency,
                        isSplit: e.isSplit,
                      });
                    }}>
                    <View style={styles.financeHeaderRow}>
                      <ThemedText style={styles.financeName}>{e.name || 'Expense'}</ThemedText>
                      <ThemedText style={styles.financeAmount}>
                        {e.amount.toFixed(2)} {e.currency}
                      </ThemedText>
                    </View>
                    <View style={styles.financeMetaRow}>
                      {e.isSplit ? <ThemedText style={styles.financeMeta}>Split</ThemedText> : null}
                      {editMode ? (
                        <View style={styles.inlineActionsRow}>
                          <Pressable
                            style={styles.inlineActionButton}
                            onPress={() => {
                              openExpenseModal({
                                id: e.id,
                                name: e.name,
                                amount: e.amount,
                                currency: e.currency,
                                isSplit: e.isSplit,
                              });
                            }}>
                            <ThemedText style={[styles.inlineActionText, { color: colors.primary }]}>Edit</ThemedText>
                          </Pressable>
                          <Pressable
                            style={styles.inlineActionButton}
                            onPress={() => {
                              if (!tripId) return;
                              Alert.alert('Delete expense?', 'This cannot be undone.', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteExpense(tripId, e.id),
                                },
                              ]);
                            }}>
                            <ThemedText
                              style={[styles.inlineActionText, styles.destructiveText, { color: colors.destructive }]}
                            >
                              Delete
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </ThemedView>
            ) : (
              <ThemedText style={styles.emptyText}>No expenses yet.</ThemedText>
            )}

            <Modal visible={expenseModalVisible} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                  <ThemedText style={styles.modalTitle}>{editingExpenseId ? 'Edit Expense' : 'Add Expense'}</ThemedText>

                  <TextInput
                    value={expenseName}
                    onChangeText={setExpenseName}
                    placeholder="Name (optional)"
                    placeholderTextColor="#888"
                    style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                  />

                  <TextInput
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                    placeholder="Amount"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                    style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                  />

                  <TextInput
                    value={expenseCurrency}
                    onChangeText={setExpenseCurrency}
                    placeholder="Currency (e.g., USD)"
                    placeholderTextColor="#888"
                    autoCapitalize="characters"
                    style={[styles.modalInput, { borderColor: colors.border, color: colors.inputText }]}
                  />

                  <Pressable
                    style={[styles.checkboxRow, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
                    onPress={() => setExpenseIsSplit((v) => !v)}>
                    <View
                      style={[
                        styles.checkboxBox,
                        {
                          borderColor: colors.border,
                          backgroundColor: expenseIsSplit ? colors.primary : colors.surface,
                        },
                      ]}
                    />
                    <ThemedText style={styles.checkboxLabel}>Split?</ThemedText>
                  </Pressable>

                  {expenseError ? <ThemedText style={styles.modalErrorText}>{expenseError}</ThemedText> : null}

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setExpenseModalVisible(false);
                        setExpenseError(null);
                        setEditingExpenseId(null);
                      }}>
                      <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.modalButton,
                        styles.modalPrimaryButton,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => {
                        if (!tripId) return;
                        const currency = expenseCurrency.trim().toUpperCase();
                        const amount = Number.parseFloat(expenseAmount);

                        if (!Number.isFinite(amount) || amount <= 0) {
                          setExpenseError('Please enter a valid amount.');
                          return;
                        }
                        if (!currency) {
                          setExpenseError('Currency is required.');
                          return;
                        }

                        if (editingExpenseId) {
                          updateExpense(tripId, editingExpenseId, {
                            name: expenseName.trim(),
                            amount,
                            currency,
                            isSplit: expenseIsSplit,
                          });
                        } else {
                          addExpense(tripId, {
                            name: expenseName.trim(),
                            amount,
                            currency,
                            isSplit: expenseIsSplit,
                          });
                        }

                        setExpenseModalVisible(false);
                        setExpenseError(null);
                        setEditingExpenseId(null);
                      }}>
                      <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </ThemedView>
        );
      case 'journal':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Journal</ThemedText>

            {journalEntries.length > 0 ? (
              <ThemedView style={styles.journalList}>
                {journalEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    style={[styles.journalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={() => {
                      if (!editMode) return;
                      openJournalModal({ id: entry.id, date: entry.date, text: entry.text });
                    }}>
                    <View style={styles.journalHeaderRow}>
                      <ThemedText style={styles.journalDate}>{entry.date}</ThemedText>
                      {editMode ? (
                        <View style={styles.inlineActionsRow}>
                          <Pressable
                            style={styles.inlineActionButton}
                            onPress={() => openJournalModal({ id: entry.id, date: entry.date, text: entry.text })}>
                            <ThemedText style={[styles.inlineActionText, { color: colors.primary }]}>Edit</ThemedText>
                          </Pressable>
                          <Pressable
                            style={styles.inlineActionButton}
                            onPress={() => {
                              if (!tripId) return;
                              Alert.alert('Delete entry?', 'This cannot be undone.', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => deleteJournalEntry(tripId, entry.id),
                                },
                              ]);
                            }}>
                            <ThemedText
                              style={[styles.inlineActionText, styles.destructiveText, { color: colors.destructive }]}
                            >
                              Delete
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText style={styles.journalText}>{entry.text}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            ) : (
              <ThemedText style={styles.emptyText}>No journal entries yet.</ThemedText>
            )}

            <Modal visible={journalModalVisible} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
                  <ThemedText style={styles.modalTitle}>{editingJournalEntryId ? 'Edit Entry' : 'Add Entry'}</ThemedText>
                  <ThemedText style={styles.modalSubtitle}>{journalDate}</ThemedText>

                  <TextInput
                    value={journalText}
                    onChangeText={setJournalText}
                    placeholder="Write something..."
                    placeholderTextColor="#888"
                    multiline
                    style={[
                      styles.modalInput,
                      styles.modalMultilineInput,
                      { borderColor: colors.border, color: colors.inputText },
                    ]}
                  />

                  {journalError ? <ThemedText style={styles.modalErrorText}>{journalError}</ThemedText> : null}

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setJournalModalVisible(false);
                        setJournalError(null);
                        setEditingJournalEntryId(null);
                      }}>
                      <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.modalButton,
                        styles.modalPrimaryButton,
                        { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => {
                        if (!tripId) return;
                        const text = journalText.trim();
                        if (!text) {
                          setJournalError('Please write something.');
                          return;
                        }

                        if (editingJournalEntryId) {
                          updateJournalEntry(tripId, editingJournalEntryId, { text });
                        } else {
                          addJournalEntry(tripId, { date: journalDate || getTodayIsoDate(), text });
                        }
                        setJournalModalVisible(false);
                        setJournalError(null);
                        setEditingJournalEntryId(null);
                      }}>
                      <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </ThemedView>
        );
      case 'photos':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Photos</ThemedText>
            <ThemedText>Your trip photos will appear here.</ThemedText>
          </ThemedView>
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.heroContainer, { height: heroHeight }]}>
        {heroDisplayedUrl ? (
          <ExpoImage
            source={{ uri: heroDisplayedUrl }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            priority="high"
          />
        ) : (
          <View style={styles.heroImageFallback} />
        )}

        {heroNextUrl ? (
          <Animated.View style={[styles.heroNextLayer, { opacity: heroNextOpacity }]}>
            <ExpoImage
              source={{ uri: heroNextUrl }}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={0}
              priority="high"
              onLoadEnd={() => {
                heroNextOpacity.setValue(1);
                heroDisplayedUrlRef.current = heroNextUrl;
                setHeroDisplayedUrl(heroNextUrl);
                setHeroNextUrl(null);
                heroNextOpacity.setValue(0);
              }}
            />
          </Animated.View>
        ) : null}
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <ThemedText style={styles.tripDestination}>Trip Details</ThemedText>
          <ThemedText style={styles.tripLocationText}>{trip?.destination ?? ''}</ThemedText>
          <ThemedText style={styles.tripDates}>
            {trip?.startDate && trip?.endDate
              ? `Departure: ${formatParamDate(trip.startDate)} | Arrival: ${formatParamDate(trip.endDate)}`
              : ''}
          </ThemedText>
        </View>
      </Animated.View>

      {/* Tabs */}
      <ThemedView style={[styles.tabsContainer, { backgroundColor: colors.surfaceMuted }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key ? { backgroundColor: colors.primary } : undefined]}
            onPress={() => setActiveTab(tab.key)}>
            <ThemedText
              numberOfLines={1}
              style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </ThemedView>

      <View style={styles.globalEditOverlay} pointerEvents="box-none">
        {activeTab === 'overview' ? null : (
          <Pressable
            style={[
              styles.globalPlusButton,
              styles.globalPlusButtonPill,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              if (!tripId) return;
              if (activeTab === 'itinerary') {
                if (selectedDayId) {
                  setEventName('');
                  setEventTime('');
                  setEventLocation('');
                  setEventError(null);
                  setEditingEventId(null);
                  setEventModalVisible(true);
                } else {
                  setSelectedDayId(null);
                  setEditingDayId(null);
                  setDayName(`Day ${itineraryDays.length + 1}`);
                  setDayModalVisible(true);
                }
                return;
              }

              if (activeTab === 'finances') {
                openExpenseModal();
                return;
              }

              if (activeTab === 'journal') {
                openJournalModal();
                return;
              }

              if (activeTab === 'photos') {
                Alert.alert('Select photos', 'Photo picking will be added soon.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'OK' },
                ]);
              }
            }}>
            <IconSymbol name="plus" size={22} color={colors.primary} />
            {activeTab === 'itinerary' ? (
              <ThemedText numberOfLines={1} style={[styles.globalPlusLabel, { color: colors.primary }]}>
                {selectedDayId ? 'Add Event' : 'Add Day'}
              </ThemedText>
            ) : activeTab === 'finances' ? (
              <ThemedText numberOfLines={1} style={[styles.globalPlusLabel, { color: colors.primary }]}>
                Add Expense
              </ThemedText>
            ) : activeTab === 'journal' ? (
              <ThemedText numberOfLines={1} style={[styles.globalPlusLabel, { color: colors.primary }]}>
                Add Entry
              </ThemedText>
            ) : activeTab === 'photos' ? (
              <ThemedText numberOfLines={1} style={[styles.globalPlusLabel, { color: colors.primary }]}>
                Add Photos
              </ThemedText>
            ) : null}
          </Pressable>
        )}
      </View>

      {/* Tab content */}
      <Animated.ScrollView
        ref={(node) => {
          scrollRef.current = (node as unknown as ScrollView) ?? null;
        }}
        style={styles.content}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        onLayout={(e) => {
          scrollLayoutHeightRef.current = e.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_, h) => {
          scrollContentHeightRef.current = h;
        }}
        onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          snapBackIfNeeded(e.nativeEvent.contentOffset.y);
        }}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          snapBackIfNeeded(e.nativeEvent.contentOffset.y);
        }}
        contentContainerStyle={styles.scrollContentContainer}>
        {renderTabContent()}
        <View style={{ height: bottomElasticSpace }} />
      </Animated.ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.bottomNavOverlay,
          { bottom: 24 },
        ]}>
        <Pressable
          style={[
            styles.bottomNavButton,
            editMode ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
            !editMode ? { backgroundColor: colors.surface, borderColor: colors.border } : null,
          ]}
          onPress={() => setEditMode((v) => !v)}>
          <IconSymbol name="pencil" size={22} color={editMode ? '#fff' : colors.primary} />
        </Pressable>

        <Pressable
          style={[styles.bottomNavButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}>
          <IconSymbol name="house.fill" size={22} color={colors.primary} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  heroImageFallback: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  heroNextLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 60,
    gap: 4,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 4,
  },
  tripDestination: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  tripLocationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  tripDates: {
    fontSize: 16,
    opacity: 0.7,
    color: '#fff',
  },
  tabsContainer: {
    marginTop: 5,
    marginHorizontal: 24,
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 4,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  globalEditOverlay: {
    height: 1,
    marginHorizontal: 24,
    overflow: 'visible',
  },
  globalPlusButton: {
    position: 'absolute',
    right: 46,
    top: -8,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  globalPlusButtonPill: {
    width: 132,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  globalPlusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  globalPencilButtonActive: {
    backgroundColor: '#007AFF',
  },
  bottomNavOverlay: {
    position: 'absolute',
    right: 24,
    gap: 12,
    alignItems: 'center',
  },
  bottomNavButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 20,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  tabContent: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  flightCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: '#fff',
  },
  flightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flightAddIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  flightSectionBlock: {
    gap: 8,
  },
  flightSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  flightSectionList: {
    gap: 10,
  },
  flightsList: {
    gap: 10,
  },
  flightItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  flightRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  flightAirportBlock: {
    flex: 1,
  },
  flightAirportBlockRight: {
    alignItems: 'flex-end',
  },
  flightAirportCode: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  flightAirportCity: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  flightArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  flightTimeLine: {
    fontSize: 13,
    opacity: 0.85,
    fontWeight: '600',
  },
  flightItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  flightSegmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  flightSegmentOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  flightSegmentOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  flightDetails: {
    gap: 4,
  },
  flightLine: {
    fontSize: 13,
    opacity: 0.8,
  },
  itineraryContainer: {
    gap: 12,
  },
  itineraryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  daysHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editToggleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  addDayButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addDayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  dayCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  dayCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dayCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayCardSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  itineraryBackButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  itineraryBackText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  itineraryDayTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addEventButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addEventButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  destructiveText: {
    color: '#D12C2C',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    paddingBottom: 24,
    gap: 10,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    backgroundColor: '#fff',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  financesList: {
    gap: 10,
  },
  financeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  financeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  financeName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  financeAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  financeMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  financeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  journalList: {
    gap: 10,
  },
  journalCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  journalDate: {
    fontSize: 13,
    opacity: 0.8,
    fontWeight: '600',
  },
  journalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  journalText: {
    fontSize: 14,
    lineHeight: 20,
  },
  financesTotalCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  financesTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  financesTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  modalErrorText: {
    fontSize: 13,
    color: '#D12C2C',
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
  },
  modalMultilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  dateSelectButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateSelectButtonText: {
    fontSize: 16,
  },
  datePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  datePickerHeaderButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  flightModalCard: {
    maxHeight: '85%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    gap: 10,
  },
  flightLookupActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  airlineResults: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  airlineResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  airlineResultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flightLookupSummary: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  flightLookupSummaryLine: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.85,
  },
  checkboxRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalPrimaryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalPrimaryButtonText: {
    color: '#fff',
  },
});
