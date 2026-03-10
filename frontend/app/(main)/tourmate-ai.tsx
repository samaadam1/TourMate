// app/(main)/tourmate-ai.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useApp } from '../../constants/AppContext';

const { width } = Dimensions.get('window');
const API_BASE = `http://${process.env.EXPO_PUBLIC_API_URL}:3000/api`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  '🏛️ Tell me about the Pyramids',
  '🗺️ Plan 3 days in Cairo',
  '🤿 Best diving in Hurghada',
  '🍽️ Must-try Egyptian food',
  '💰 Budget tips for Egypt',
  '🌡️ Best time to visit Luxor',
  '🎒 What to pack for Sharm?',
  '⚠️ Safety tips for tourists',
];

// ── Message Bubble with speak button ─────────────────────────────────
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const soundRef = useRef<any>(null);

  const handleSpeak = async () => {
    // ── Resume if paused ──────────────────────────────────────────
    if (paused && soundRef.current) {
      await soundRef.current.playAsync();
      setSpeaking(true);
      setPaused(false);
      return;
    }

    // ── Pause if playing ──────────────────────────────────────────
    if (speaking && soundRef.current) {
      await soundRef.current.pauseAsync();
      setSpeaking(false);
      setPaused(true);
      return;
    }

    setLoadingAudio(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      const res = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'TourMate AI',
          description: message.content,
          language: 'en',
          // signal to backend: skip Groq, just TTS the text directly
          raw_text: message.content,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error('TTS failed');

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mpeg;base64,${data.audio}` },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setSpeaking(true);
      setPaused(false);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setSpeaking(false);
          setPaused(false);
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.error('Speak error:', err);
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarIcon}>🧳</Text>
        </View>
      )}
      <View style={{ maxWidth: width * 0.72 }}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {message.content}
          </Text>
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Speak button — only on AI messages */}
        {!isUser && (
          <TouchableOpacity
            style={[styles.speakBtn, speaking && styles.speakBtnActive, paused && styles.speakBtnPaused]}
            onPress={handleSpeak}
            disabled={loadingAudio}
            activeOpacity={0.8}
          >
            {loadingAudio
              ? <ActivityIndicator size="small" color="#E67E22" />
              : <Text style={[styles.speakBtnText, speaking && styles.speakBtnTextActive, paused && styles.speakBtnTextPaused]}>
                  {speaking ? '⏸ Pause' : paused ? '▶ Resume' : '🔊 Listen'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function TourMateAIScreen() {
  const router = useRouter();
  const { t } = useApp();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "👋 Hello! I'm Tour Mate, your personal Egyptian travel assistant!\n\nI can help you with:\n🏛️ Historical places & monuments\n🗺️ Trip planning & itineraries\n💰 Budget advice & cost estimates\n🍽️ Local food recommendations\n🎒 Packing tips by city & season\n⚠️ Safety tips for tourists\n\nWhat would you like to know about Egypt?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text?: string): Promise<void> => {
    const messageText = (text ?? input).trim();
    if (!messageText || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== '0')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: 'user', content: messageText },
          ],
        }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }]);
      } else {
        throw new Error(data.error ?? 'No response');
      }
    } catch (err) {
      console.error('AI error:', err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process your request. Please make sure your backend is running and try again! 🙏",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('aiTitle')}</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => setMessages([{ id: '0', role: 'assistant', content: "👋 Hello again! How can I help you with your Egyptian adventure?", timestamp: new Date() }])}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
          {messages.map(message => <MessageBubble key={message.id} message={message} />)}

          {loading && (
            <View style={styles.bubbleRow}>
              <View style={styles.aiAvatar}><Text style={styles.aiAvatarIcon}>🧳</Text></View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#E67E22" />
                <Text style={styles.typingText}>Tour Mate is thinking...</Text>
              </View>
            </View>
          )}

          {messages.length === 1 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Quick questions:</Text>
              <View style={styles.suggestionsGrid}>
                {SUGGESTIONS.map((suggestion, index) => (
                  <TouchableOpacity key={index} style={styles.suggestionChip} onPress={() => sendMessage(suggestion.slice(2).trim())}>
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            {...{placeholder: t('aiPlaceholder')}}
            placeholderTextColor="#AAA"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sendIcon}>→</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 22, fontWeight: '700', color: '#333' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#27AE60' },
  onlineText: { fontSize: 11, color: '#27AE60', fontWeight: '600' },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  clearBtnText: { fontSize: 13, color: '#999', fontWeight: '600' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 20 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  aiAvatarIcon: { fontSize: 18 },
  bubble: { borderRadius: 20, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  bubbleAI: { backgroundColor: '#FFF', borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: '#E67E22', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  bubbleTextUser: { color: '#FFF' },
  bubbleTime: { fontSize: 10, color: '#BBB', marginTop: 4, textAlign: 'right' },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.7)' },

  // Speak button
  speakBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FDDCB5' },
  speakBtnActive: { backgroundColor: '#FFE5E5', borderColor: '#FFAAAA' },
  speakBtnPaused: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  speakBtnText: { fontSize: 11, color: '#E67E22', fontWeight: '700' },
  speakBtnTextActive: { color: '#E74C3C' },
  speakBtnTextPaused: { color: '#27AE60' },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderRadius: 20, borderBottomLeftRadius: 4, padding: 12 },
  typingText: { fontSize: 13, color: '#999' },
  suggestionsContainer: { marginTop: 8 },
  suggestionsTitle: { fontSize: 13, color: '#999', fontWeight: '600', marginBottom: 10 },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#EEE', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  suggestionText: { fontSize: 13, color: '#555', fontWeight: '500' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 10 },
  input: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#333', maxHeight: 100, borderWidth: 1, borderColor: '#EEE' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E67E22', justifyContent: 'center', alignItems: 'center', shadowColor: '#E67E22', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  sendBtnDisabled: { backgroundColor: '#DDD', shadowOpacity: 0 },
  sendIcon: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});