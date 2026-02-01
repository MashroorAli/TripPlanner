import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { type Trip, useTrips } from '@/context/trips-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MyTripsScreen() {
  const router = useRouter();
  const { trips } = useTrips();
  const { signOut } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const formatParamDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const handleTripPress = (trip: Trip) => {
    router.push({
      pathname: '/trip/[id]',
      params: {
        id: trip.id,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="title">My Trips</ThemedText>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace('/auth');
            }}>
            <ThemedText style={[styles.signOutText, { color: colors.primary }]}>Sign out</ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      {trips.length > 0 ? (
        trips.map((trip) => (
          <Pressable key={trip.id} style={styles.tripCard} onPress={() => handleTripPress(trip)}>
            <ThemedText style={styles.tripDestination}>{trip.destination}</ThemedText>
            <ThemedText style={styles.tripDates}>
              {formatParamDate(trip.startDate)} - {formatParamDate(trip.endDate)}
            </ThemedText>
          </Pressable>
        ))
      ) : (
        <ThemedText style={styles.placeholder}>Your saved trips will appear here.</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  header: {
    marginTop: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signOutText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tripCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  tripDestination: {
    fontSize: 18,
    fontWeight: '600',
  },
  tripDates: {
    fontSize: 14,
    opacity: 0.7,
  },
  placeholder: {
    opacity: 0.5,
  },
});
