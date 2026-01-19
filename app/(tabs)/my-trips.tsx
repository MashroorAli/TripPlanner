import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MyTripsScreen() {
  const { destination, startDate, endDate } = useLocalSearchParams<{
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>();

  const formatParamDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const hasTripData = destination && startDate && endDate;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">My Trips</ThemedText>
      </ThemedView>

      {hasTripData ? (
        <Pressable style={styles.tripCard}>
          <ThemedText style={styles.tripDestination}>{destination}</ThemedText>
          <ThemedText style={styles.tripDates}>
            {formatParamDate(startDate)} - {formatParamDate(endDate)}
          </ThemedText>
        </Pressable>
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
