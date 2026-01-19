import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTrips } from '@/context/trips-context';

export default function TripDetailsScreen() {
  const { id, destination, startDate, endDate } = useLocalSearchParams<{
    id?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>();
  const router = useRouter();
  const { trips } = useTrips();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'finances' | 'journal'>('overview');

  const trip = id ? trips.find((t) => t.id === id) : undefined;
  const resolvedDestination = trip?.destination ?? destination;
  const resolvedStartDate = trip?.startDate ?? startDate;
  const resolvedEndDate = trip?.endDate ?? endDate;

  const formatParamDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'itinerary' as const, label: 'Itinerary' },
    { key: 'finances' as const, label: 'Finances' },
    { key: 'journal' as const, label: 'Journal' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Trip Overview</ThemedText>
            <ThemedText>Destination: {destination || ''}</ThemedText>
            <ThemedText>Start: {formatParamDate(startDate)}</ThemedText>
            <ThemedText>End: {formatParamDate(endDate)}</ThemedText>
          </ThemedView>
        );
      case 'itinerary':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Itinerary</ThemedText>
            <ThemedText>Your daily plans will appear here.</ThemedText>
          </ThemedView>
        );
      case 'finances':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Finances</ThemedText>
            <ThemedText>Budget and expenses will appear here.</ThemedText>
          </ThemedView>
        );
      case 'journal':
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Journal</ThemedText>
            <ThemedText>Your travel notes and memories will appear here.</ThemedText>
          </ThemedView>
        );
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with home button and trip info */}
      <ThemedView style={styles.header}>
        <Pressable style={styles.homeButton} onPress={() => router.back()}>
          <ThemedText style={styles.homeButtonText}>← Home</ThemedText>
        </Pressable>
        <ThemedText style={styles.tripDestination}>{resolvedDestination || 'Trip'}</ThemedText>
        <ThemedText style={styles.tripDates}>
          {formatParamDate(resolvedStartDate)} - {formatParamDate(resolvedEndDate)}
        </ThemedText>
      </ThemedView>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}>
            <ThemedText style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView style={styles.content}>{renderTabContent()}</ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 4,
  },
  homeButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  homeButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  tripDestination: {
    fontSize: 24,
    fontWeight: '600',
  },
  tripDates: {
    fontSize: 16,
    opacity: 0.7,
  },
  tabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  tabContent: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
});
