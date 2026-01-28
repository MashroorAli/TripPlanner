import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTrips } from '@/context/trips-context';

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const router = useRouter();
  const {
    trips,
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
  } = useTrips();
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'finances' | 'journal' | 'photos'>('overview');

  const trip = id ? trips.find((t) => t.id === id) : undefined;
  const tripId = id;
  const flight = tripId ? flightByTripId[tripId] : undefined;
  const itineraryDays = tripId ? itineraryByTripId[tripId] ?? [] : [];
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
  const [flightDepartureDate, setFlightDepartureDate] = useState('');
  const [flightDepartureTime, setFlightDepartureTime] = useState('');
  const [flightAirline, setFlightAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightFrom, setFlightFrom] = useState('');
  const [flightTo, setFlightTo] = useState('');
  const [flightError, setFlightError] = useState<string | null>(null);

  const formatParamDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  const openFlightModal = () => {
    setFlightDepartureDate(flight?.departureDate ?? '');
    setFlightDepartureTime(flight?.departureTime ?? '');
    setFlightAirline(flight?.airline ?? '');
    setFlightNumber(flight?.flightNumber ?? '');
    setFlightFrom(flight?.from ?? '');
    setFlightTo(flight?.to ?? '');
    setFlightError(null);
    setFlightModalVisible(true);
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
        const countdownBase = flight?.departureDate ?? trip?.startDate;
        return (
          <ThemedView style={styles.tabContent}>
            <ThemedText style={styles.sectionTitle}>Trip Overview</ThemedText>
            <ThemedText style={styles.countdownText}>
              There are {getDaysUntilTrip(countdownBase)} days until the trip!
            </ThemedText>

            <ThemedView style={styles.flightCard}>
              <View style={styles.flightHeaderRow}>
                <ThemedText style={styles.flightTitle}>Departing Flight</ThemedText>
              </View>

              {editMode ? (
                <View style={styles.inlineActionsRow}>
                  <Pressable style={styles.inlineActionButton} onPress={openFlightModal}>
                    <ThemedText style={styles.inlineActionText}>{flight ? 'Edit' : 'Add'}</ThemedText>
                  </Pressable>
                  {flight ? (
                    <Pressable
                      style={styles.inlineActionButton}
                      onPress={() => {
                        if (!tripId) return;
                        Alert.alert('Remove departing flight?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => clearFlightInfo(tripId) },
                        ]);
                      }}>
                      <ThemedText style={[styles.inlineActionText, styles.destructiveText]}>Remove</ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {flight ? (
                <ThemedView style={styles.flightDetails}>
                  <ThemedText style={styles.flightLine}>
                    Departure: {flight.departureDate} {flight.departureTime}
                  </ThemedText>
                  {flight.airline ? <ThemedText style={styles.flightLine}>Airline: {flight.airline}</ThemedText> : null}
                  {flight.flightNumber ? (
                    <ThemedText style={styles.flightLine}>Flight: {flight.flightNumber}</ThemedText>
                  ) : null}
                  {flight.from ? <ThemedText style={styles.flightLine}>From: {flight.from}</ThemedText> : null}
                  {flight.to ? <ThemedText style={styles.flightLine}>To: {flight.to}</ThemedText> : null}
                </ThemedView>
              ) : (
                <ThemedText style={styles.emptyText}>No flight info added yet.</ThemedText>
              )}
            </ThemedView>

            <Modal visible={flightModalVisible} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <ThemedText style={styles.modalTitle}>{flight ? 'Edit Flight' : 'Add Flight'}</ThemedText>

                  <TextInput
                    value={flightDepartureDate}
                    onChangeText={setFlightDepartureDate}
                    placeholder="Departure date (YYYY-MM-DD)"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                  />

                  <TextInput
                    value={flightDepartureTime}
                    onChangeText={setFlightDepartureTime}
                    placeholder="Departure time (HH:MM)"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                  />

                  <TextInput
                    value={flightAirline}
                    onChangeText={setFlightAirline}
                    placeholder="Airline (optional)"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                  />

                  <TextInput
                    value={flightNumber}
                    onChangeText={setFlightNumber}
                    placeholder="Flight number (optional)"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                  />

                  <TextInput
                    value={flightFrom}
                    onChangeText={setFlightFrom}
                    placeholder="From (optional)"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                  />

                  <TextInput
                    value={flightTo}
                    onChangeText={setFlightTo}
                    placeholder="To (optional)"
                    placeholderTextColor="#888"
                    style={styles.modalInput}
                  />

                  {flightError ? <ThemedText style={styles.modalErrorText}>{flightError}</ThemedText> : null}

                  <View style={styles.modalActions}>
                    <Pressable
                      style={styles.modalButton}
                      onPress={() => {
                        setFlightModalVisible(false);
                        setFlightError(null);
                      }}>
                      <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                    </Pressable>

                    <Pressable
                      style={[styles.modalButton, styles.modalPrimaryButton]}
                      onPress={() => {
                        if (!tripId) return;
                        const depDate = flightDepartureDate.trim();
                        const depTime = flightDepartureTime.trim();
                        if (!depDate || !depTime) {
                          setFlightError('Departure date and time are required.');
                          return;
                        }
                        setFlightInfo(tripId, {
                          departureDate: depDate,
                          departureTime: depTime,
                          airline: flightAirline.trim() ? flightAirline.trim() : undefined,
                          flightNumber: flightNumber.trim() ? flightNumber.trim() : undefined,
                          from: flightFrom.trim() ? flightFrom.trim() : undefined,
                          to: flightTo.trim() ? flightTo.trim() : undefined,
                        });
                        setFlightModalVisible(false);
                        setFlightError(null);
                      }}>
                      <ThemedText style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Save</ThemedText>
                    </Pressable>
                  </View>
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
                    <ThemedText style={styles.itineraryBackText}>← Days</ThemedText>
                  </Pressable>
                </View>

                <ThemedText style={styles.itineraryDayTitle}>{selectedDay.label}</ThemedText>

                <Pressable
                  style={styles.addEventButton}
                  onPress={() => {
                    setEventName('');
                    setEventTime('');
                    setEventLocation('');
                    setEventError(null);
                    setEditingEventId(null);
                    setEventModalVisible(true);
                  }}>
                  <ThemedText style={styles.addEventButtonText}>+ Add Event</ThemedText>
                </Pressable>

                {selectedDay.events.length > 0 ? (
                  <ScrollView style={styles.eventsList} contentContainerStyle={styles.eventsListContent}>
                    {selectedDay.events
                      .slice()
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((e) => (
                        <ThemedView key={e.id} style={styles.eventCard}>
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
                                  <ThemedText style={styles.inlineActionText}>Edit</ThemedText>
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
                                  <ThemedText style={[styles.inlineActionText, styles.destructiveText]}>Delete</ThemedText>
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
                    <View style={styles.modalCard}>
                      <ThemedText style={styles.modalTitle}>{editingEventId ? 'Edit Event' : 'Add Event'}</ThemedText>

                      <TextInput
                        value={eventName}
                        onChangeText={setEventName}
                        placeholder="Name"
                        placeholderTextColor="#888"
                        style={styles.modalInput}
                      />

                      <TextInput
                        value={eventTime}
                        onChangeText={setEventTime}
                        placeholder="Time (e.g., 9:00 AM)"
                        placeholderTextColor="#888"
                        style={styles.modalInput}
                      />

                      <TextInput
                        value={eventLocation}
                        onChangeText={setEventLocation}
                        placeholder="Location (optional)"
                        placeholderTextColor="#888"
                        style={styles.modalInput}
                      />

                      {eventError ? <ThemedText style={styles.modalErrorText}>{eventError}</ThemedText> : null}

                      <View style={styles.modalActions}>
                        <Pressable
                          style={styles.modalButton}
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
                          style={[styles.modalButton, styles.modalPrimaryButton]}
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
                <View style={styles.daysHeaderRow}>
                  <Pressable
                    style={styles.addDayButton}
                    onPress={() => {
                      setEditingDayId(null);
                      setDayName(`Day ${itineraryDays.length + 1}`);
                      setDayModalVisible(true);
                    }}>
                    <ThemedText style={styles.addDayButtonText}>+ Add Day</ThemedText>
                  </Pressable>
                </View>

                <Modal visible={dayModalVisible} transparent animationType="fade">
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                      <ThemedText style={styles.modalTitle}>{editingDayId ? 'Edit Day' : 'Add Day'}</ThemedText>

                      <TextInput
                        value={dayName}
                        onChangeText={setDayName}
                        placeholder="Day name"
                        placeholderTextColor="#888"
                        style={styles.modalInput}
                      />

                      <View style={styles.modalActions}>
                        <Pressable
                          style={styles.modalButton}
                          onPress={() => {
                            setDayModalVisible(false);
                            setDayName('');
                            setEditingDayId(null);
                          }}>
                          <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </Pressable>

                        <Pressable
                          style={[styles.modalButton, styles.modalPrimaryButton]}
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
                      style={styles.dayCard}
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
      {/* Header with home button and trip info */}
      <ThemedView style={styles.header}>
        <Pressable style={styles.homeButton} onPress={() => router.back()}>
          <ThemedText style={styles.homeButtonText}>← Home</ThemedText>
        </Pressable>
        <ThemedText style={styles.tripDestination}>Trip Details</ThemedText>
      </ThemedView>

      {/* Tabs */}
      <ThemedView style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
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
        <Pressable
          style={[styles.globalPencilButton, editMode && styles.globalPencilButtonActive]}
          onPress={() => {
            setEditMode((v) => !v);
          }}>
          <IconSymbol name="pencil" size={18} color={editMode ? '#fff' : '#007AFF'} />
        </Pressable>
      </View>

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
  globalPencilButton: {
    position: 'absolute',
    right: 0,
    top: -20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  globalPencilButtonActive: {
    backgroundColor: '#007AFF',
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
  flightTitle: {
    fontSize: 16,
    fontWeight: '600',
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
