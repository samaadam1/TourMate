// app/(main)/plan.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Modal, FlatList, Image,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../constants/AppContext';

const { width } = Dimensions.get('window');

// ── Egyptian Cities ───────────────────────────────────────────────────
const EGYPTIAN_CITIES = [
  { name: 'Hurghada', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Hurghada_city.jpg/1280px-Hurghada_city.jpg', lat: 27.2579, lon: 33.8116 },
  { name: 'Cairo', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cairo_from_the_Nile.jpg/1280px-Cairo_from_the_Nile.jpg', lat: 30.0444, lon: 31.2357 },
  { name: 'Alexandria', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Alexandria_montage.jpg/1280px-Alexandria_montage.jpg', lat: 31.2001, lon: 29.9187 },
  { name: 'Luxor', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Valley_of_the_Kings_from_the_air.jpg/1280px-Valley_of_the_Kings_from_the_air.jpg', lat: 25.6872, lon: 32.6396 },
  { name: 'Aswan', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Aswan_-_panoramio.jpg/1280px-Aswan_-_panoramio.jpg', lat: 24.0889, lon: 32.8998 },
  { name: 'Sharm El Sheikh', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sharm_el-Sheikh_bay.jpg/1280px-Sharm_el-Sheikh_bay.jpg', lat: 27.9158, lon: 34.3300 },
  { name: 'Dahab', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Dahab_-_panoramio.jpg/1280px-Dahab_-_panoramio.jpg', lat: 28.5096, lon: 34.5179 },
  { name: 'Marsa Matrouh', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Marsa_Matruh.jpg/1280px-Marsa_Matruh.jpg', lat: 31.3543, lon: 27.2373 },
  { name: 'Siwa', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Siwa_Oasis.jpg/1280px-Siwa_Oasis.jpg', lat: 29.2031, lon: 25.5195 },
  { name: 'El Gouna', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Hurghada_city.jpg/1280px-Hurghada_city.jpg', lat: 27.3949, lon: 33.6773 },
];

// ── Interest Tags ─────────────────────────────────────────────────────
const INTERESTS = [
  { label: 'Adventure', icon: '🏔️' },
  { label: 'Diving', icon: '🤿' },
  { label: 'Food', icon: '🍽️' },
  { label: 'Party', icon: '🎉' },
  { label: 'History', icon: '🏛️' },
  { label: 'Shopping', icon: '🛍️' },
  { label: 'Nature', icon: '🌿' },
  { label: 'Nightlife', icon: '🌙' },
  { label: 'Family', icon: '👨‍👩‍👧' },
  { label: 'Culture', icon: '🎭' },
];

// ── Calendar helpers ──────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const getDaysInMonth = (month: number, year: number): number =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (month: number, year: number): number => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

// ── Weather helpers ───────────────────────────────────────────────────
const getWeatherInfo = (code: number): { icon: string; label: string } => {
  if (code === 0) return { icon: '☀️', label: 'Clear' };
  if (code <= 2) return { icon: '⛅', label: 'Partly Cloudy' };
  if (code === 3) return { icon: '☁️', label: 'Cloudy' };
  if (code <= 49) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 59) return { icon: '🌦️', label: 'Drizzle' };
  if (code <= 69) return { icon: '🌧️', label: 'Rainy' };
  if (code <= 79) return { icon: '❄️', label: 'Snowy' };
  if (code <= 99) return { icon: '⛈️', label: 'Stormy' };
  return { icon: '🌡️', label: 'Unknown' };
};

interface DayForecast {
  date: string;
  day: string;
  maxTemp: number;
  minTemp: number;
  icon: string;
  label: string;
}

// ── PLAN SCREEN ───────────────────────────────────────────────────────
export default function PlanScreen() {
  const router = useRouter();
  const { t } = useApp();

  const [selectedCity, setSelectedCity] = useState(EGYPTIAN_CITIES[0]);
  const [showCityModal, setShowCityModal] = useState(false);

  // Calendar
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);

  // Budget & interests
  const [budget, setBudget] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Weather
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    fetchForecast(selectedCity);
  }, [selectedCity]);

  // ── Fetch 5-day forecast ──────────────────────────────────────────
  const fetchForecast = async (city: typeof EGYPTIAN_CITIES[0]): Promise<void> => {
    setWeatherLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Africa%2FCairo&forecast_days=5`
      );
      const data = await res.json();
      const days: DayForecast[] = data.daily.time.map((date: string, i: number) => {
        const d = new Date(date);
        const info = getWeatherInfo(data.daily.weathercode[i]);
        return {
          date,
          day: SHORT_DAYS[d.getDay()],
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          icon: info.icon,
          label: info.label,
        };
      });
      setForecast(days);
    } catch (err) {
      console.error('Forecast error:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  // ── Calendar logic ────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  const handleDayPress = (day: number) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day); setEndDate(null);
    } else {
      if (day < startDate) { setStartDate(day); setEndDate(null); }
      else setEndDate(day);
    }
  };

  const isDaySelected = (day: number) => day === startDate || day === endDate;
  const isDayInRange = (day: number) => startDate && endDate && day > startDate && day < endDate;
  const isDayToday = (day: number) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const handleNext = () => {
    if (!startDate || !endDate) { alert('Please select your travel dates.'); return; }
    if (!budget) { alert('Please enter your budget.'); return; }
    if (selectedInterests.length === 0) { alert('Please select at least one interest.'); return; }
    router.push({
      pathname: '/(main)/pick-spots' as any,
      params: {
        city: selectedCity.name,
        startDate: `${currentYear}-${currentMonth + 1}-${startDate}`,
        endDate: `${currentYear}-${currentMonth + 1}-${endDate}`,
        budget,
        interests: selectedInterests.join(','),
      },
    });
  };

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const CELL_SIZE = (width - 40 - 32) / 7;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('plan')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── City Selector ── */}
        <TouchableOpacity style={styles.cityCard} onPress={() => setShowCityModal(true)} activeOpacity={0.9}>
          <Image source={{ uri: selectedCity.image }} style={styles.cityImage} />
          <View style={styles.cityOverlay}>
            <View style={styles.cityPill}>
              <Text style={styles.cityPillIcon}>📍</Text>
              <Text style={styles.cityPillText}>{selectedCity.name}, Egypt</Text>
              <Text style={styles.cityPillArrow}>▾</Text>
            </View>
          </View>
          <Text style={styles.cityName}>{selectedCity.name}</Text>
        </TouchableOpacity>

        {/* ── 5-Day Weather Forecast ── */}
        <View style={styles.card}>
          <View style={styles.forecastHeader}>
            <Text style={styles.cardTitle}>{t('weather')} — {selectedCity.name}</Text>
            <Text style={styles.forecastSubtitle}>{t('forecast')}</Text>
          </View>
          {weatherLoading ? (
            <ActivityIndicator size="small" color="#E67E22" style={{ marginVertical: 10 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {forecast.map((day, index) => (
                <View
                  key={index}
                  style={[styles.forecastDay, index === 0 && styles.forecastDayToday]}
                >
                  <Text style={[styles.forecastDayName, index === 0 && styles.forecastDayNameToday]}>
                    {index === 0 ? 'Today' : day.day}
                  </Text>
                  <Text style={styles.forecastIcon}>{day.icon}</Text>
                  <Text style={[styles.forecastMax, index === 0 && styles.forecastMaxToday]}>
                    {day.maxTemp}°
                  </Text>
                  <Text style={styles.forecastMin}>{day.minTemp}°</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Calendar ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('plan')}</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthArrowBtn}>
              <Text style={styles.monthArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthArrowBtn}>
              <Text style={styles.monthArrow}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayHeader, { width: CELL_SIZE }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarCells.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  { width: CELL_SIZE, height: CELL_SIZE },
                  day && isDaySelected(day) && styles.dayCellSelected,
                  day && isDayInRange(day) && styles.dayCellInRange,
                  day && isDayToday(day) && !isDaySelected(day) && styles.dayCellToday,
                ]}
                onPress={() => day && handleDayPress(day)}
                disabled={!day}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayCellText,
                  day && isDaySelected(day) && styles.dayCellTextSelected,
                  day && isDayInRange(day) && styles.dayCellTextRange,
                ]}>
                  {day ?? ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {startDate && (
            <Text style={styles.selectedRange}>
              {startDate && endDate
                ? `${MONTHS[currentMonth]} ${startDate} → ${MONTHS[currentMonth]} ${endDate}`
                : `From: ${MONTHS[currentMonth]} ${startDate} — select end date`}
            </Text>
          )}
        </View>

        {/* ── Budget ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Budget</Text>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetCurrency}>$</Text>
            <TextInput
              style={styles.budgetInput}
              placeholder="Enter your budget"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
          </View>
        </View>

        {/* ── Interests ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Interests</Text>
          <View style={styles.interestsGrid}>
            {INTERESTS.map(interest => (
              <TouchableOpacity
                key={interest.label}
                style={[
                  styles.interestTag,
                  selectedInterests.includes(interest.label) && styles.interestTagSelected,
                ]}
                onPress={() => toggleInterest(interest.label)}
                activeOpacity={0.7}
              >
                <Text style={styles.interestIcon}>{interest.icon}</Text>
                <Text style={[
                  styles.interestLabel,
                  selectedInterests.includes(interest.label) && styles.interestLabelSelected,
                ]}>
                  {interest.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Next Step ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{t('plan')} →</Text>
        </TouchableOpacity>
      </View>

      {/* ── City Modal ── */}
      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('whereTo')}</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={EGYPTIAN_CITIES}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityOption, selectedCity.name === item.name && styles.cityOptionSelected]}
                  onPress={() => { setSelectedCity(item); setShowCityModal(false); }}
                >
                  <Image source={{ uri: item.image }} style={styles.cityOptionImage} />
                  <Text style={[styles.cityOptionText, selectedCity.name === item.name && styles.cityOptionTextSelected]}>
                    {item.name}
                  </Text>
                  {selectedCity.name === item.name && <Text style={styles.cityOptionCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
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

  // City card
  cityCard: { margin: 16, borderRadius: 20, overflow: 'hidden', height: 160 },
  cityImage: { width: '100%', height: '100%' },
  cityOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'flex-start', alignItems: 'flex-start', padding: 12 },
  cityPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  cityPillIcon: { fontSize: 12 },
  cityPillText: { fontSize: 13, fontWeight: '600', color: '#333' },
  cityPillArrow: { fontSize: 12, color: '#666' },
  cityName: { position: 'absolute', bottom: 14, left: 16, fontSize: 28, fontWeight: '800', color: '#FFF' },

  // Card
  card: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },

  // Forecast
  forecastHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  forecastSubtitle: { fontSize: 12, color: '#999' },
  forecastDay: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, marginRight: 8, backgroundColor: '#F9F9F9', minWidth: 60 },
  forecastDayToday: { backgroundColor: '#FFF3E0', borderWidth: 1.5, borderColor: '#E67E22' },
  forecastDayName: { fontSize: 12, color: '#999', fontWeight: '600', marginBottom: 6 },
  forecastDayNameToday: { color: '#E67E22' },
  forecastIcon: { fontSize: 22, marginBottom: 6 },
  forecastMax: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  forecastMaxToday: { color: '#E67E22' },
  forecastMin: { fontSize: 12, color: '#AAA', marginTop: 2 },

  // Calendar
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthArrowBtn: { padding: 8 },
  monthArrow: { fontSize: 22, color: '#333', fontWeight: '600' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  dayHeaders: { flexDirection: 'row', marginBottom: 6 },
  dayHeader: { textAlign: 'center', fontSize: 11, color: '#AAA', fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { justifyContent: 'center', alignItems: 'center', borderRadius: 100 },
  dayCellSelected: { backgroundColor: '#E67E22' },
  dayCellInRange: { backgroundColor: '#FFF3E0', borderRadius: 0 },
  dayCellToday: { borderWidth: 1.5, borderColor: '#E67E22' },
  dayCellText: { fontSize: 13, color: '#333', fontWeight: '500' },
  dayCellTextSelected: { color: '#FFF', fontWeight: '700' },
  dayCellTextRange: { color: '#E67E22' },
  selectedRange: { marginTop: 10, fontSize: 13, color: '#E67E22', fontWeight: '600', textAlign: 'center' },

  // Budget
  budgetRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  budgetCurrency: { fontSize: 18, fontWeight: '700', color: '#333', marginRight: 8 },
  budgetInput: { flex: 1, fontSize: 16, color: '#333' },

  // Interests
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  interestTagSelected: { backgroundColor: '#FFF3E0', borderColor: '#E67E22' },
  interestIcon: { fontSize: 14 },
  interestLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  interestLabelSelected: { color: '#E67E22', fontWeight: '700' },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 30, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 8 },
  nextBtn: { backgroundColor: '#E67E22', borderRadius: 30, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '70%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalClose: { fontSize: 18, color: '#999', fontWeight: '600' },
  cityOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F8F8', gap: 12 },
  cityOptionSelected: { backgroundColor: '#FFF8F0' },
  cityOptionImage: { width: 44, height: 44, borderRadius: 10 },
  cityOptionText: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  cityOptionTextSelected: { color: '#E67E22', fontWeight: '700' },
  cityOptionCheck: { fontSize: 16, color: '#E67E22', fontWeight: '700' },
});