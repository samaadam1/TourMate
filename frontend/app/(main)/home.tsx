// app/(main)/home.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, FlatList, ActivityIndicator,
  StatusBar, SafeAreaView, Modal, Dimensions, Animated,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Attraction } from '../../constants/types';

const { width, height } = Dimensions.get('window');
const API_BASE = `http://${process.env.EXPO_PUBLIC_API_URL}:3000/api`;
const EXCHANGE_KEY = process.env.EXPO_PUBLIC_EXCHANGE_API_KEY;

// ── City coords for weather ───────────────────────────────────────────
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Alexandria': { lat: 31.2001, lon: 29.9187 },
  'Cairo': { lat: 30.0444, lon: 31.2357 },
  'Hurghada': { lat: 27.2579, lon: 33.8116 },
  'Luxor': { lat: 25.6872, lon: 32.6396 },
  'Aswan': { lat: 24.0889, lon: 32.8998 },
  'Sharm El Sheikh': { lat: 27.9158, lon: 34.3300 },
};

const getWeatherInfo = (code: number) => {
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

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
];

const CATEGORY_COLORS: Record<string, string> = {
  historical: '#8B4513',
  beaches: '#0077B6',
  restaurants: '#E63946',
  shopping: '#9B2335',
  nature: '#2D6A4F',
  diving: '#023E8A',
  culture: '#6D3B8E',
  nightlife: '#1A1A2E',
  adventure: '#D62828',
};

const ALL_CATEGORIES = ['Historical', 'Beaches', 'Restaurants', 'Shopping', 'Nature', 'Diving', 'Culture', 'Nightlife', 'Adventure'];
const PRICE_PRESETS = [
  { label: 'Any', max: null },
  { label: '< $50', max: 50 },
  { label: '< $100', max: 100 },
  { label: '< $200', max: 200 },
];

// ── Filter Sheet ──────────────────────────────────────────────────────
interface FilterState {
  categories: string[];
  maxPrice: number | null;
  minRating: number;
}

const DEFAULT_FILTERS: FilterState = { categories: [], maxPrice: null, minRating: 0 };

interface FilterSheetProps {
  visible: boolean;
  initial: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({ visible, initial, onApply, onClose }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [draft, setDraft] = useState<FilterState>(initial);

  useEffect(() => {
    setDraft(initial);
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 260, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const toggleCategory = (cat: string) => {
    setDraft(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const activeFilterCount =
    draft.categories.length +
    (draft.maxPrice !== null ? 1 : 0) +
    (draft.minRating > 0 ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.sheetBackdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.filterSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter Attractions</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterActiveBadge}>
              <Text style={styles.filterActiveBadgeText}>{activeFilterCount} active</Text>
            </View>
          )}
          <TouchableOpacity onPress={onClose} style={styles.filterCloseBtn}>
            <Text style={styles.filterCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

          {/* Category */}
          <Text style={styles.filterSectionLabel}>CATEGORY</Text>
          <View style={styles.filterChipsWrap}>
            {ALL_CATEGORIES.map(cat => {
              const key = cat.toLowerCase();
              const active = draft.categories.includes(key);
              const color = CATEGORY_COLORS[key] ?? '#E67E22';
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => toggleCategory(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price */}
          <Text style={styles.filterSectionLabel}>MAX PRICE</Text>
          <View style={styles.filterPriceRow}>
            {PRICE_PRESETS.map(preset => {
              const active = draft.maxPrice === preset.max;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.filterPriceBtn, active && styles.filterPriceBtnActive]}
                  onPress={() => setDraft(prev => ({ ...prev, maxPrice: preset.max }))}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPriceBtnText, active && styles.filterPriceBtnTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Rating */}
          <Text style={styles.filterSectionLabel}>MINIMUM RATING</Text>
          <View style={styles.filterStarRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => setDraft(prev => ({ ...prev, minRating: prev.minRating === star ? 0 : star }))}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterStar,
                  star <= draft.minRating && styles.filterStarActive,
                ]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.filterStarLabel}>
              {draft.minRating > 0 ? `${draft.minRating}+ stars` : 'Any'}
            </Text>
          </View>

        </ScrollView>

        {/* Actions */}
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterResetBtn}
            onPress={() => setDraft(DEFAULT_FILTERS)}
            activeOpacity={0.8}
          >
            <Text style={styles.filterResetBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterApplyBtn}
            onPress={() => { onApply(draft); onClose(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.filterApplyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ── Star Rating ───────────────────────────────────────────────────────
const StarRating: React.FC<{ rating: number; size?: number; color?: string }> = ({
  rating, size = 11, color = '#FFC107',
}) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Text key={i} style={{ color: i <= Math.round(rating) ? color : '#DDD', fontSize: size }}>★</Text>
    ))}
    <Text style={{ color: '#888', fontSize: size - 1, marginLeft: 3 }}>{rating}</Text>
  </View>
);

// ── Weather Widget ────────────────────────────────────────────────────
const WeatherWidget: React.FC<{ city: string }> = ({ city }) => {
  const [weather, setWeather] = useState<{ temp: number; icon: string; label: string } | null>(null);
  useEffect(() => { fetchWeather(); }, [city]);
  const fetchWeather = async () => {
    try {
      const coords = CITY_COORDS[city] ?? CITY_COORDS['Alexandria'];
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`);
      const data = await res.json();
      const info = getWeatherInfo(data.current_weather.weathercode);
      setWeather({ temp: Math.round(data.current_weather.temperature), icon: info.icon, label: info.label });
    } catch { }
  };
  if (!weather) return null;
  return (
    <View style={styles.weatherWidget}>
      <Text style={styles.weatherIcon}>{weather.icon}</Text>
      <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
      <Text style={styles.weatherLabel}>{weather.label}</Text>
    </View>
  );
};

// ── Attraction Bottom Sheet ───────────────────────────────────────────
interface AttractionSheetProps {
  attraction: Attraction | null;
  visible: boolean;
  onClose: () => void;
}

const AttractionSheet: React.FC<AttractionSheetProps> = ({ attraction, visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isFavorited, setIsFavorited] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (visible && attraction) {
      fetchImages(attraction.id);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, attraction]);

  const fetchImages = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/attractions/${id}/images`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setImages(data.data.map((img: any) => img.image_url));
      } else {
        setImages(attraction?.image_url ? [attraction.image_url] : []);
      }
      setActiveImage(0);
    } catch {
      setImages(attraction?.image_url ? [attraction.image_url] : []);
    }
  };

  const toggleFavorite = async () => {
    setIsFavorited(prev => !prev);
    try {
      await fetch(`${API_BASE}/attractions/${attraction?.id}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1 }),
      });
    } catch {
      setIsFavorited(prev => !prev);
    }
  };

  if (!attraction) return null;

  const categoryColor = CATEGORY_COLORS[attraction.category] ?? '#E67E22';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.sheetBackdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>

        {/* Drag handle */}
        <View style={styles.sheetHandle} />

        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {(images.length > 0 ? images : [attraction.image_url]).map((img, i) => (
              <Image key={i} source={{ uri: img }} style={styles.galleryImage} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Image dots */}
          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.imageDot, i === activeImage && styles.imageDotActive]} />
              ))}
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
            <Text style={styles.sheetCloseBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity style={styles.sheetFavBtn} onPress={toggleFavorite}>
            <Text style={[styles.sheetFavIcon, isFavorited && { color: '#E74C3C' }]}>
              {isFavorited ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>

          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryBadgeText}>{attraction.category}</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>

          {/* Name & Location */}
          <Text style={styles.sheetName}>{attraction.name}</Text>
          <View style={styles.sheetLocationRow}>
            <Text style={styles.sheetLocationIcon}>📍</Text>
            <Text style={styles.sheetLocationText}>{attraction.city}, Egypt</Text>
          </View>

          {/* Rating row */}
          <View style={styles.sheetRatingRow}>
            <StarRating rating={Number(attraction.rating)} size={14} />
          </View>

          {/* Info pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.infoPillsRow}>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillIcon}>💰</Text>
              <View>
                <Text style={styles.infoPillLabel}>Price from</Text>
                <Text style={styles.infoPillValue}>${attraction.price_from}</Text>
              </View>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillIcon}>🕐</Text>
              <View>
                <Text style={styles.infoPillLabel}>Hours</Text>
                <Text style={styles.infoPillValue} numberOfLines={1}>{attraction.opening_hours ?? 'See website'}</Text>
              </View>
            </View>
            <View style={styles.infoPill}>
              <Text style={styles.infoPillIcon}>🏷️</Text>
              <View>
                <Text style={styles.infoPillLabel}>Category</Text>
                <Text style={[styles.infoPillValue, { textTransform: 'capitalize' }]}>{attraction.category}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Description */}
          <Text style={styles.sheetAboutTitle}>About</Text>
          <Text style={styles.sheetAboutText}>{attraction.description}</Text>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={styles.sheetFavoritesBtn}
            onPress={toggleFavorite}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetFavoritesBtnText}>
              {isFavorited ? '♥ Saved' : '♡ Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetPlanBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.sheetPlanBtnText}>🗺️ Add to Plan</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </Modal>
  );
};

// ── Popular Card ──────────────────────────────────────────────────────
const PopularCard: React.FC<{ item: Attraction; onPress: (item: Attraction) => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.popularCard} onPress={() => onPress(item)} activeOpacity={0.9}>
    <Image source={{ uri: item.image_url }} style={styles.popularImage} />
    <View style={styles.popularOverlay}>
      <Text style={styles.popularName}>{item.name}</Text>
      <Text style={styles.popularPrice}>from ${item.price_from}</Text>
      <StarRating rating={Number(item.rating)} color="#FFF" />
    </View>
  </TouchableOpacity>
);

// ── Nearest Card ──────────────────────────────────────────────────────
const NearestCard: React.FC<{ item: Attraction; onPress: (item: Attraction) => void }> = ({ item, onPress }) => (
  <TouchableOpacity style={styles.nearestCard} onPress={() => onPress(item)} activeOpacity={0.9}>
    <Image source={{ uri: item.image_url }} style={styles.nearestImage} />
    <View style={styles.nearestOverlay}>
      <Text style={styles.nearestName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.nearestPrice}>From ${item.price_from}</Text>
      <StarRating rating={Number(item.rating)} color="#FFF" />
    </View>
  </TouchableOpacity>
);

// ── Bottom Tab ────────────────────────────────────────────────────────
const BottomTab: React.FC<{ active: string }> = ({ active }) => {
  const router = useRouter();
  const tabs = [
    { name: 'Home', icon: '🏠', route: '/(main)/home' },
    { name: 'Plan', icon: '🗺️', route: '/(main)/plan' },
    { name: 'Tour Mate', icon: '🧳', route: '/(main)/tourmate-ai' },
    { name: 'Favorites', icon: '♡', route: '/(main)/favorites' },
    { name: 'View Map', icon: '📍', route: '/(main)/map' },
  ];
  return (
    <View style={styles.bottomTab}>
      {tabs.map(tab => (
        <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => { if (tab.name !== active) router.push(tab.route as any); }}>
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, tab.name === active && styles.tabLabelActive]}>{tab.name}</Text>
          {tab.name === active && <View style={styles.tabDot} />}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ── Currency Modal ────────────────────────────────────────────────────
const CurrencyModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [amount, setAmount] = useState('1');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => { if (visible) fetchRate(selectedCurrency.code); }, [visible]);

  const fetchRate = async (code: string) => {
    setLoading(true); setRate(null);
    try {
      const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_KEY}/pair/${code}/EGP`);
      const data = await res.json();
      if (data.result === 'success') {
        setRate(data.conversion_rate);
        const d = new Date(data.time_last_update_utc);
        setLastUpdated(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      }
    } catch { }
    finally { setLoading(false); }
  };

  const selectCurrency = (c: typeof CURRENCIES[0]) => { setSelectedCurrency(c); setShowPicker(false); fetchRate(c.code); };
  const converted = rate && amount ? (parseFloat(amount || '0') * rate).toFixed(2) : '—';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.currencySheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💱 Currency Exchange</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live rate</Text>
            {lastUpdated ? <Text style={styles.liveDate}> · Updated {lastUpdated}</Text> : null}
          </View>
          <Text style={styles.currencyLabel}>From</Text>
          <TouchableOpacity style={styles.currencySelector} onPress={() => setShowPicker(!showPicker)}>
            <Text style={styles.currencyFlag}>{selectedCurrency.flag}</Text>
            <View style={styles.currencySelectorText}>
              <Text style={styles.currencyCode}>{selectedCurrency.code}</Text>
              <Text style={styles.currencyName}>{selectedCurrency.name}</Text>
            </View>
            <Text style={styles.currencySelectorArrow}>▾</Text>
          </TouchableOpacity>
          {showPicker && (
            <View style={styles.pickerDropdown}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200 }}>
                {CURRENCIES.map(c => (
                  <TouchableOpacity key={c.code} style={[styles.pickerItem, selectedCurrency.code === c.code && styles.pickerItemActive]} onPress={() => selectCurrency(c)}>
                    <Text style={styles.pickerFlag}>{c.flag}</Text>
                    <Text style={styles.pickerCode}>{c.code}</Text>
                    <Text style={styles.pickerName}>{c.name}</Text>
                    {selectedCurrency.code === c.code && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <Text style={styles.currencyLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountCurrencyCode}>{selectedCurrency.code}</Text>
            <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1" placeholderTextColor="#AAA" />
          </View>
          <View style={styles.convertArrow}><Text style={styles.convertArrowIcon}>↓</Text></View>
          <Text style={styles.currencyLabel}>To</Text>
          <View style={styles.resultBox}>
            <Text style={styles.resultFlag}>🇪🇬</Text>
            <View style={styles.resultTextBox}>
              <Text style={styles.resultCode}>EGP</Text>
              <Text style={styles.resultName}>Egyptian Pound</Text>
            </View>
            {loading ? <ActivityIndicator size="small" color="#E67E22" /> : <Text style={styles.resultAmount}>{converted}</Text>}
          </View>
          {rate && <Text style={styles.rateInfo}>1 {selectedCurrency.code} = {rate.toFixed(4)} EGP</Text>}
        </View>
      </View>
    </Modal>
  );
};

// ── HOME SCREEN ───────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [popular, setPopular] = useState<Attraction[]>([]);
  const [nearest, setNearest] = useState<Attraction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCurrency, setShowCurrency] = useState(false);

  // Filter state
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilter, setShowFilter] = useState(false);

  // Bottom sheet state
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [popRes, nearRes] = await Promise.all([
        fetch(`${API_BASE}/attractions/popular`),
        fetch(`${API_BASE}/attractions/nearest?city=Alexandria`),
      ]);
      const popData = await popRes.json();
      const nearData = await nearRes.json();
      setPopular(popData.data ?? []);
      setNearest(nearData.data ?? []);
    } catch (err) { console.error('Fetch error:', err); }
    finally { setLoading(false); }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`${API_BASE}/attractions/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setSearchResults(data.data ?? []);
    } catch { }
  };

  const openAttraction = (item: Attraction) => {
    setSelectedAttraction(item);
    setShowSheet(true);
  };

  // ── Apply active filters ────────────────────────────────────────────
  const applyFilters = (list: Attraction[]) => {
    return list.filter(item => {
      if (activeFilters.categories.length > 0 && !activeFilters.categories.includes(item.category.toLowerCase())) return false;
      if (activeFilters.maxPrice !== null && Number(item.price_from) > activeFilters.maxPrice) return false;
      if (activeFilters.minRating > 0 && Number(item.rating) < activeFilters.minRating) return false;
      return true;
    });
  };

  const filteredPopular = applyFilters(popular);
  const filteredNearest = applyFilters(nearest);
  const filteredSearch = applyFilters(searchResults);

  const activeFilterCount =
    activeFilters.categories.length +
    (activeFilters.maxPrice !== null ? 1 : 0) +
    (activeFilters.minRating > 0 ? 1 : 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E67E22" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F5F0" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationRow} onPress={() => router.push('/(main)/map' as any)}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>Alexandria, Egypt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pointsBadge} onPress={() => router.push('/(main)/rewards' as any)}>
            <Text style={styles.pointsText}>100 ⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(main)/settings' as any)}>
            <Text style={styles.avatarIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* ── Weather ── */}
        <WeatherWidget city="Alexandria" />

        {/* ── Title ── */}
        <Text style={styles.heroTitle}>Plan your next trip »</Text>

        {/* ── Search ── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="#AAA"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilter(true)} activeOpacity={0.85}>
            <Text style={styles.filterIcon}>⚙️</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search Dropdown ── */}
        {filteredSearch.length > 0 && (
          <View style={styles.searchDropdown}>
            {filteredSearch.map(item => (
              <TouchableOpacity key={item.id} style={styles.searchResultItem} onPress={() => openAttraction(item)}>
                <Text style={styles.searchResultText}>{item.name}</Text>
                <Text style={styles.searchResultSub}>{item.city}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Popular ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular locations</Text>
          {activeFilterCount > 0 && (
            <Text style={styles.sectionFilterNote}>{filteredPopular.length} result{filteredPopular.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        {filteredPopular.length === 0
          ? <Text style={styles.emptyFilterText}>No popular places match your filters.</Text>
          : <FlatList
            data={filteredPopular}
            keyExtractor={item => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 10 }}
            renderItem={({ item }) => <PopularCard item={item} onPress={openAttraction} />}
          />
        }

        {/* ── Nearest ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearest Places</Text>
          {activeFilterCount > 0 && (
            <Text style={styles.sectionFilterNote}>{filteredNearest.length} result{filteredNearest.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        {filteredNearest.length === 0
          ? <Text style={styles.emptyFilterText}>No nearby places match your filters.</Text>
          : <FlatList
            data={filteredNearest}
            keyExtractor={item => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 10, paddingBottom: 10 }}
            renderItem={({ item }) => <NearestCard item={item} onPress={openAttraction} />}
          />
        }

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Floating Currency Button ── */}
      <TouchableOpacity style={styles.floatingCurrencyBtn} onPress={() => setShowCurrency(true)} activeOpacity={0.85}>
        <Text style={styles.floatingCurrencyIcon}>$ → </Text>
        <View>
          <Text style={styles.floatingCurrencyTitle}>Currency</Text>
          <Text style={styles.floatingCurrencySubtitle}>Convert → EGP</Text>
        </View>
      </TouchableOpacity>

      <BottomTab active="Home" />

      {/* ── Modals ── */}
      <CurrencyModal visible={showCurrency} onClose={() => setShowCurrency(false)} />
      <AttractionSheet
        attraction={selectedAttraction}
        visible={showSheet}
        onClose={() => setShowSheet(false)}
      />
      <FilterSheet
        visible={showFilter}
        initial={activeFilters}
        onApply={setActiveFilters}
        onClose={() => setShowFilter(false)}
      />
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9F5F0' },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F5F0' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDEBE8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationPin: { fontSize: 12, marginRight: 4 },
  locationText: { fontSize: 13, color: '#555', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pointsBadge: { backgroundColor: '#FFF3E0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pointsText: { fontSize: 13, color: '#E67E22', fontWeight: '700' },
  avatarBtn: { backgroundColor: '#EEE', borderRadius: 20, padding: 8 },
  avatarIcon: { fontSize: 14 },

  // Weather
  weatherWidget: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  weatherIcon: { fontSize: 22 },
  weatherTemp: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  weatherLabel: { fontSize: 13, color: '#999', fontWeight: '500' },

  // Hero
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', paddingHorizontal: 20, marginTop: 10, marginBottom: 16 },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 24, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterBtn: { backgroundColor: '#E67E22', borderRadius: 30, padding: 14 },
  filterIcon: { fontSize: 16 },
  filterBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1A1A1A', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  searchDropdown: { marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, marginBottom: 12, overflow: 'hidden' },
  searchResultItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  searchResultText: { fontSize: 14, fontWeight: '600', color: '#333' },
  searchResultSub: { fontSize: 12, color: '#999', marginTop: 2 },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  sectionFilterNote: { fontSize: 12, color: '#E67E22', fontWeight: '600' },
  emptyFilterText: { fontSize: 13, color: '#AAA', paddingHorizontal: 20, marginBottom: 12, fontStyle: 'italic' },

  // Popular cards
  popularCard: { width: 190, height: 130, borderRadius: 16, overflow: 'hidden', marginRight: 12 },
  popularImage: { width: '100%', height: '100%' },
  popularOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: 'rgba(0,0,0,0.38)' },
  popularName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  popularPrice: { color: '#FFE0A0', fontSize: 11, marginTop: 1 },

  // Nearest cards
  nearestCard: { width: 130, height: 150, borderRadius: 14, overflow: 'hidden', marginRight: 10 },
  nearestImage: { width: '100%', height: '100%' },
  nearestOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.38)' },
  nearestName: { color: '#FFF', fontSize: 11, fontWeight: '700', lineHeight: 14 },
  nearestPrice: { color: '#FFE0A0', fontSize: 10, marginTop: 2 },

  // Bottom tab
  bottomTab: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 10, color: '#AAA', marginTop: 2 },
  tabLabelActive: { color: '#E67E22', fontWeight: '700' },
  tabDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E67E22', marginTop: 2 },

  // Floating currency
  floatingCurrencyBtn: { position: 'absolute', right: 16, bottom: 88, backgroundColor: '#E67E22', borderRadius: 30, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#E67E22', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  floatingCurrencyIcon: { fontSize: 14, color: '#FFF', fontWeight: '900' },
  floatingCurrencyTitle: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  floatingCurrencySubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 9, marginTop: 1 },

  // ── Attraction Bottom Sheet ────────────────────────────────────────
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.88, overflow: 'hidden' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  // Gallery
  galleryContainer: { width, height: 240, position: 'relative' },
  galleryImage: { width, height: 240 },
  imageDots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 5, left: 0, right: 0, justifyContent: 'center' },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  imageDotActive: { backgroundColor: '#FFF', width: 18 },
  sheetCloseBtn: { position: 'absolute', top: 14, left: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheetCloseBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  sheetFavBtn: { position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheetFavIcon: { color: '#FFF', fontSize: 18 },
  categoryBadge: { position: 'absolute', bottom: 14, left: 14, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  categoryBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Content
  sheetContent: { paddingHorizontal: 20, paddingTop: 16 },
  sheetName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 6 },
  sheetLocationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sheetLocationIcon: { fontSize: 13, marginRight: 4 },
  sheetLocationText: { fontSize: 13, color: '#888', fontWeight: '500' },
  sheetRatingRow: { marginBottom: 14 },
  infoPillsRow: { marginBottom: 16 },
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, gap: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  infoPillIcon: { fontSize: 18 },
  infoPillLabel: { fontSize: 10, color: '#AAA', fontWeight: '600' },
  infoPillValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', maxWidth: 100 },
  sheetAboutTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  sheetAboutText: { fontSize: 14, color: '#666', lineHeight: 22 },

  // Action buttons
  sheetActions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32, gap: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  sheetFavoritesBtn: { flex: 1, borderWidth: 2, borderColor: '#E67E22', borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  sheetFavoritesBtnText: { color: '#E67E22', fontSize: 15, fontWeight: '700' },
  sheetPlanBtn: { flex: 2, backgroundColor: '#E67E22', borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  sheetPlanBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Currency modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  currencySheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  modalClose: { fontSize: 18, color: '#999' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27AE60', marginRight: 6 },
  liveText: { fontSize: 12, color: '#27AE60', fontWeight: '700' },
  liveDate: { fontSize: 12, color: '#999' },
  currencyLabel: { fontSize: 12, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  currencySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 16, padding: 14, marginBottom: 8, gap: 10, borderWidth: 1, borderColor: '#EEE' },
  currencyFlag: { fontSize: 28 },
  currencySelectorText: { flex: 1 },
  currencyCode: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  currencyName: { fontSize: 12, color: '#999', marginTop: 2 },
  currencySelectorArrow: { fontSize: 14, color: '#999' },
  pickerDropdown: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', marginBottom: 12, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  pickerItemActive: { backgroundColor: '#FFF8F0' },
  pickerFlag: { fontSize: 20 },
  pickerCode: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', width: 40 },
  pickerName: { flex: 1, fontSize: 12, color: '#666' },
  pickerCheck: { fontSize: 13, color: '#E67E22', fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EEE', gap: 10 },
  amountCurrencyCode: { fontSize: 15, fontWeight: '700', color: '#E67E22' },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  convertArrow: { alignItems: 'center', marginVertical: 8 },
  convertArrowIcon: { fontSize: 22, color: '#E67E22', fontWeight: '700' },
  resultBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 16, padding: 14, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: '#FDDCB5' },
  resultFlag: { fontSize: 28 },
  resultTextBox: { flex: 1 },
  resultCode: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  resultName: { fontSize: 12, color: '#999', marginTop: 2 },
  resultAmount: { fontSize: 22, fontWeight: '800', color: '#E67E22' },
  rateInfo: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 },

  // ── Filter Sheet ────────────────────────────────────────────────────
  filterSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: height * 0.80, overflow: 'hidden', paddingHorizontal: 20 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingBottom: 16 },
  filterTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  filterActiveBadge: { backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 10 },
  filterActiveBadgeText: { color: '#E67E22', fontSize: 11, fontWeight: '700' },
  filterCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  filterCloseBtnText: { fontSize: 13, color: '#555', fontWeight: '700' },
  filterSectionLabel: { fontSize: 11, fontWeight: '800', color: '#AAA', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },
  filterChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FFF' },
  filterChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  filterChipTextActive: { color: '#FFF' },
  filterPriceRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterPriceBtn: { flex: 1, borderRadius: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center', backgroundColor: '#FFF' },
  filterPriceBtnActive: { backgroundColor: '#E67E22', borderColor: '#E67E22' },
  filterPriceBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
  filterPriceBtnTextActive: { color: '#FFF' },
  filterStarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  filterStar: { fontSize: 32, color: '#E0E0E0' },
  filterStarActive: { color: '#FFC107' },
  filterStarLabel: { fontSize: 13, color: '#999', fontWeight: '600', marginLeft: 4 },
  filterActions: { flexDirection: 'row', gap: 12, paddingVertical: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  filterResetBtn: { flex: 1, borderWidth: 2, borderColor: '#E67E22', borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  filterResetBtnText: { color: '#E67E22', fontSize: 15, fontWeight: '700' },
  filterApplyBtn: { flex: 2, backgroundColor: '#E67E22', borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  filterApplyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});