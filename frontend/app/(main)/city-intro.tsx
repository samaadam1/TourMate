// app/(main)/city-intro.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, SafeAreaView, Modal, FlatList,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');
const API_BASE = `http://${process.env.EXPO_PUBLIC_API_URL}:3000/api`;
const AVIATION_KEY = process.env.EXPO_PUBLIC_AVIATIONSTACK_KEY;

// ── Airport codes per city ────────────────────────────────────────────
const CITY_AIRPORTS: Record<string, { code: string; name: string }> = {
  'Hurghada': { code: 'HRG', name: 'Hurghada International' },
  'Cairo': { code: 'CAI', name: 'Cairo International' },
  'Alexandria': { code: 'HBE', name: 'Borg El Arab' },
  'Luxor': { code: 'LXR', name: 'Luxor International' },
  'Aswan': { code: 'ASW', name: 'Aswan International' },
  'Sharm El Sheikh': { code: 'SSH', name: 'Sharm El Sheikh International' },
};

// ── Departure cities ──────────────────────────────────────────────────
const DEPARTURE_CITIES = [
  { city: 'Alexandria', code: 'HBE', flag: '🇪🇬' },
  { city: 'Cairo', code: 'CAI', flag: '🇪🇬' },
  { city: 'Dubai', code: 'DXB', flag: '🇦🇪' },
  { city: 'London', code: 'LHR', flag: '🇬🇧' },
  { city: 'Riyadh', code: 'RUH', flag: '🇸🇦' },
  { city: 'Kuwait', code: 'KWI', flag: '🇰🇼' },
];

// ── Types ─────────────────────────────────────────────────────────────
interface Flight {
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  class: string;
  price: number;
  logo: string;
}

interface Hotel {
  id: number;
  name: string;
  city: string;
  stars: number;
  price_per_night: number;
  image_url: string;
  rating: number;
}

// ── Sample flights (realistic data for when API returns no results) ────
const getSampleFlights = (fromCode: string, toCode: string): Flight[] => [
  {
    airline: 'EgyptAir',
    flightNumber: 'MS' + Math.floor(Math.random() * 900 + 100),
    departure: fromCode,
    arrival: toCode,
    departureTime: '06:00 AM',
    arrivalTime: '08:15 AM',
    duration: '2h 15m',
    class: 'Economy',
    price: 199,
    logo: '🛫',
  },
  {
    airline: 'Air Arabia',
    flightNumber: 'G9' + Math.floor(Math.random() * 900 + 100),
    departure: fromCode,
    arrival: toCode,
    departureTime: '11:30 AM',
    arrivalTime: '01:45 PM',
    duration: '2h 15m',
    class: 'Economy',
    price: 149,
    logo: '✈️',
  },
  {
    airline: 'EgyptAir',
    flightNumber: 'MS' + Math.floor(Math.random() * 900 + 100),
    departure: fromCode,
    arrival: toCode,
    departureTime: '04:00 PM',
    arrivalTime: '06:15 PM',
    duration: '2h 15m',
    class: 'Business',
    price: 349,
    logo: '🛫',
  },
];

// ── Stars component ───────────────────────────────────────────────────
const Stars: React.FC<{ count: number }> = ({ count }) => (
  <View style={{ flexDirection: 'row' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Text key={i} style={{ color: i < count ? '#FFC107' : '#DDD', fontSize: 12 }}>★</Text>
    ))}
  </View>
);

// ── CITY INTRO / TRANSPORTATION SCREEN ───────────────────────────────
export default function CityIntroScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ city: string; planId: string; startDate: string; endDate: string; budget: string }>();
  const city = params.city ?? 'Hurghada';
  const planId = params.planId;

  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState(DEPARTURE_CITIES[0]);

  useEffect(() => {
    fetchFlights(selectedDeparture.code);
    fetchHotels();
  }, [city]);

  // ── Fetch flights from Aviationstack ─────────────────────────────
  const fetchFlights = async (fromCode: string): Promise<void> => {
    setLoadingFlights(true);
    setFlights([]);
    const toAirport = CITY_AIRPORTS[city] ?? CITY_AIRPORTS['Hurghada'];
    try {
      const res = await fetch(
        `http://api.aviationstack.com/v1/flights?access_key=${AVIATION_KEY}&dep_iata=${fromCode}&arr_iata=${toAirport.code}&limit=3`
      );
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const mapped: Flight[] = data.data.map((f: any, i: number) => ({
          airline: f.airline?.name ?? 'EgyptAir',
          flightNumber: f.flight?.iata ?? `MS${100 + i}`,
          departure: f.departure?.iata ?? fromCode,
          arrival: f.arrival?.iata ?? toAirport.code,
          departureTime: f.departure?.scheduled
            ? new Date(f.departure.scheduled).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '08:00 AM',
          arrivalTime: f.arrival?.scheduled
            ? new Date(f.arrival.scheduled).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '10:15 AM',
          duration: '2h 15m',
          class: i === 2 ? 'Business' : 'Economy',
          price: i === 2 ? 349 : 149 + (i * 50),
          logo: '✈️',
        }));
        setFlights(mapped);
      } else {
        // Fallback to sample data if API returns nothing
        setFlights(getSampleFlights(fromCode, toAirport.code));
      }
    } catch (err) {
      console.error('Flights error:', err);
      setFlights(getSampleFlights(fromCode, toAirport.code));
    } finally {
      setLoadingFlights(false);
    }
  };

  // ── Fetch hotels from backend ────────────────────────────────────
  const fetchHotels = async (): Promise<void> => {
    setLoadingHotels(true);
    try {
      const res = await fetch(`${API_BASE}/hotels?city=${encodeURIComponent(city)}`);
      const data = await res.json();
      setHotels(data.data ?? []);
    } catch (err) {
      console.error('Hotels error:', err);
    } finally {
      setLoadingHotels(false);
    }
  };

  // ── Calculate nights ─────────────────────────────────────────────
  const getNights = (): number => {
    if (!params.startDate || !params.endDate) return 3;
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const nights = getNights();
  const hotelTotal = selectedHotel ? selectedHotel.price_per_night * nights : 0;
  const flightTotal = selectedFlight ? selectedFlight.price * 2 : 0; // return trip
  const total = hotelTotal + flightTotal;

  const handleDetermineplan = () => {
    if (!selectedFlight) { alert('Please select a flight.'); return; }
    if (!selectedHotel) { alert('Please select a hotel.'); return; }
    alert(`🎉 Your plan is confirmed!\n\nFlight: ${selectedFlight.airline} ${selectedFlight.flightNumber}\nHotel: ${selectedHotel.name}\nTotal: $${total}`);
  };

  const changeDeparture = (dep: typeof DEPARTURE_CITIES[0]) => {
    setSelectedDeparture(dep);
    setShowDepartureModal(false);
    fetchFlights(dep.code);
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Travel plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Destination banner ── */}
        <View style={styles.destinationBanner}>
          <Text style={styles.destinationIcon}>📍</Text>
          <Text style={styles.destinationText}>Traveling to {city}</Text>
          {planId && <Text style={styles.planId}>Plan #{planId}</Text>}
        </View>

        {/* ── Departure selector ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Departure City</Text>
          <TouchableOpacity
            style={styles.departureSelector}
            onPress={() => setShowDepartureModal(true)}
          >
            <Text style={styles.departurFlag}>{selectedDeparture.flag}</Text>
            <View style={styles.departureSelectorText}>
              <Text style={styles.departureCityName}>{selectedDeparture.city}</Text>
              <Text style={styles.departureCode}>{selectedDeparture.code} Airport</Text>
            </View>
            <Text style={styles.departureSelectorArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* ── Flights ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✈️ Flights</Text>
            <Text style={styles.sectionSubtitle}>{selectedDeparture.code} → {CITY_AIRPORTS[city]?.code ?? 'HRG'}</Text>
          </View>

          {loadingFlights ? (
            <ActivityIndicator size="small" color="#E67E22" style={{ marginVertical: 20 }} />
          ) : (
            flights.map((flight, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.flightCard, selectedFlight === flight && styles.flightCardSelected]}
                onPress={() => setSelectedFlight(flight)}
                activeOpacity={0.85}
              >
                <View style={styles.flightTop}>
                  <View style={styles.flightAirline}>
                    <Text style={styles.flightLogo}>{flight.logo}</Text>
                    <View>
                      <Text style={styles.flightAirlineName}>{flight.airline}</Text>
                      <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.flightClassBadge}>
                    <Text style={styles.flightClassText}>{flight.class}</Text>
                  </View>
                </View>

                <View style={styles.flightRoute}>
                  <View style={styles.flightTime}>
                    <Text style={styles.flightTimeText}>{flight.departureTime}</Text>
                    <Text style={styles.flightCode}>{flight.departure}</Text>
                  </View>
                  <View style={styles.flightMiddle}>
                    <Text style={styles.flightDuration}>{flight.duration}</Text>
                    <View style={styles.flightLine}>
                      <View style={styles.flightDot} />
                      <View style={styles.flightLineBar} />
                      <Text style={styles.flightPlane}>✈</Text>
                    </View>
                  </View>
                  <View style={styles.flightTime}>
                    <Text style={styles.flightTimeText}>{flight.arrivalTime}</Text>
                    <Text style={styles.flightCode}>{flight.arrival}</Text>
                  </View>
                </View>

                <View style={styles.flightBottom}>
                  <Text style={styles.flightPriceLabel}>Round trip</Text>
                  <Text style={styles.flightPrice}>${flight.price * 2}</Text>
                </View>

                {selectedFlight === flight && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Hotels ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏨 Hotels</Text>
            <Text style={styles.sectionSubtitle}>{nights} nights</Text>
          </View>

          {loadingHotels ? (
            <ActivityIndicator size="small" color="#E67E22" style={{ marginVertical: 20 }} />
          ) : hotels.length === 0 ? (
            <Text style={styles.emptyText}>No hotels found for {city}</Text>
          ) : (
            hotels.map(hotel => (
              <TouchableOpacity
                key={hotel.id}
                style={[styles.hotelCard, selectedHotel?.id === hotel.id && styles.hotelCardSelected]}
                onPress={() => setSelectedHotel(hotel)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: hotel.image_url }} style={styles.hotelImage} />
                <View style={styles.hotelInfo}>
                  <Text style={styles.hotelName} numberOfLines={1}>{hotel.name}</Text>
                  <Stars count={hotel.stars} />
                  <Text style={styles.hotelRating}>⭐ {hotel.rating}</Text>
                  <View style={styles.hotelPriceRow}>
                    <Text style={styles.hotelPrice}>${hotel.price_per_night}</Text>
                    <Text style={styles.hotelPriceNight}>/night</Text>
                  </View>
                  <Text style={styles.hotelTotal}>Total: ${hotel.price_per_night * nights}</Text>
                </View>
                {selectedHotel?.id === hotel.id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Cost Summary ── */}
        {(selectedFlight || selectedHotel) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Cost Summary</Text>
            {selectedFlight && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>✈️ Flights (round trip)</Text>
                <Text style={styles.summaryValue}>${flightTotal}</Text>
              </View>
            )}
            {selectedHotel && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>🏨 Hotel ({nights} nights)</Text>
                <Text style={styles.summaryValue}>${hotelTotal}</Text>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotal}>${total}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Determine Plan Button ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.determineBtn, (!selectedFlight || !selectedHotel) && styles.determineBtnDisabled]}
          onPress={handleDetermineplan}
          activeOpacity={0.85}
        >
          <Text style={styles.determineBtnText}>Determine the plan</Text>
        </TouchableOpacity>
      </View>

      {/* ── Departure Modal ── */}
      <Modal visible={showDepartureModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Departure City</Text>
              <TouchableOpacity onPress={() => setShowDepartureModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {DEPARTURE_CITIES.map(dep => (
              <TouchableOpacity
                key={dep.code}
                style={[styles.depOption, selectedDeparture.code === dep.code && styles.depOptionSelected]}
                onPress={() => changeDeparture(dep)}
              >
                <Text style={styles.depFlag}>{dep.flag}</Text>
                <View style={styles.depOptionText}>
                  <Text style={styles.depCityName}>{dep.city}</Text>
                  <Text style={styles.depCode}>{dep.code} Airport</Text>
                </View>
                {selectedDeparture.code === dep.code && (
                  <Text style={styles.depCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700', color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  container: { flex: 1 },

  // Destination banner
  destinationBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', margin: 16, borderRadius: 16, padding: 14, gap: 8 },
  destinationIcon: { fontSize: 20 },
  destinationText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#E67E22' },
  planId: { fontSize: 12, color: '#999' },

  // Section
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  sectionSubtitle: { fontSize: 12, color: '#999' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 20 },

  // Departure selector
  departureSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  departurFlag: { fontSize: 28 },
  departureSelectorText: { flex: 1 },
  departureCityName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  departureCode: { fontSize: 12, color: '#999', marginTop: 2 },
  departureSelectorArrow: { fontSize: 14, color: '#999' },

  // Flight card
  flightCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, borderWidth: 1.5, borderColor: 'transparent' },
  flightCardSelected: { borderColor: '#E67E22', backgroundColor: '#FFFAF5' },
  flightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  flightAirline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flightLogo: { fontSize: 24 },
  flightAirlineName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  flightNumber: { fontSize: 12, color: '#999', marginTop: 2 },
  flightClassBadge: { backgroundColor: '#FFF3E0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  flightClassText: { fontSize: 11, color: '#E67E22', fontWeight: '700' },
  flightRoute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  flightTime: { alignItems: 'center' },
  flightTimeText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  flightCode: { fontSize: 12, color: '#999', marginTop: 2 },
  flightMiddle: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  flightDuration: { fontSize: 11, color: '#999', marginBottom: 4 },
  flightLine: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  flightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E67E22' },
  flightLineBar: { flex: 1, height: 1.5, backgroundColor: '#E0E0E0' },
  flightPlane: { fontSize: 14 },
  flightBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 10 },
  flightPriceLabel: { fontSize: 12, color: '#999' },
  flightPrice: { fontSize: 18, fontWeight: '800', color: '#E67E22' },

  // Hotel card
  hotelCard: { backgroundColor: '#FFF', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, borderWidth: 1.5, borderColor: 'transparent' },
  hotelCardSelected: { borderColor: '#E67E22' },
  hotelImage: { width: 110, height: 110 },
  hotelInfo: { flex: 1, padding: 12 },
  hotelName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  hotelRating: { fontSize: 12, color: '#666', marginTop: 4 },
  hotelPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 },
  hotelPrice: { fontSize: 18, fontWeight: '800', color: '#E67E22' },
  hotelPriceNight: { fontSize: 12, color: '#999' },
  hotelTotal: { fontSize: 11, color: '#999', marginTop: 2 },

  // Selected badge
  selectedBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#E67E22', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  selectedBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  // Summary
  summaryCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#555' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  summaryDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  summaryTotal: { fontSize: 20, fontWeight: '800', color: '#E67E22' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 30, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 8 },
  determineBtn: { backgroundColor: '#E67E22', borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
  determineBtnDisabled: { backgroundColor: '#DDD' },
  determineBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalClose: { fontSize: 18, color: '#999' },
  depOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8F8F8', gap: 12 },
  depOptionSelected: { backgroundColor: '#FFF8F0' },
  depFlag: { fontSize: 24 },
  depOptionText: { flex: 1 },
  depCityName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  depCode: { fontSize: 12, color: '#999', marginTop: 2 },
  depCheck: { fontSize: 16, color: '#E67E22', fontWeight: '700' },
});