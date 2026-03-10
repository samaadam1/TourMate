// backend/src/routes/tts.js
import express from 'express';

const router = express.Router();

// ElevenLabs voice IDs
const VOICES = {
  en: 'JBFqnCBsd6RMkjVDRZzb', // George — clear, natural English male
  ar: 'pqHfZKP75CvOlQylNhV4', // Bella Arabic — ElevenLabs Arabic voice
};

// POST /api/tts
// Body: { name, city, category, description, price_from, opening_hours, language }
//   OR: { raw_text, language }  ← skips Groq, reads text directly (used by AI chat)
// Returns: { success, audio: base64, script }
router.post('/', async (req, res) => {
  try {
    const {
      name,
      city,
      category,
      description,
      price_from,
      opening_hours,
      language = 'en',
      raw_text,       // ← AI chat passes this to skip Groq
    } = req.body;

    // ── Raw text mode: skip Groq entirely (AI chatbot) ─────────────
    if (raw_text) {
      // Strip markdown symbols so ElevenLabs reads clean text
      const cleanText = raw_text
        .replace(/[*_`#~]/g, '')
        .replace(/\n{2,}/g, ' ')
        .trim();

      const voiceId = VOICES[language] ?? VOICES.en;

      const elevenResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
          }),
        }
      );

      if (!elevenResponse.ok) {
        const errText = await elevenResponse.text();
        console.error('ElevenLabs error (raw):', errText);
        return res.status(500).json({ success: false, message: 'Failed to generate audio' });
      }

      const audioBuffer = await elevenResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      return res.json({ success: true, audio: base64Audio, script: cleanText });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: 'Attraction name is required' });
    }

    // ── Step 1: Generate tour script via Groq ──────────────────────
    const isArabic = language === 'ar';

    const prompt = isArabic
      ? `أنت مرشد سياحي محترف في مصر. اكتب تعليقًا صوتيًا قصيرًا وجذابًا باللغة العربية الفصحى عن هذا المكان السياحي لاستخدامه في تطبيق سياحي.

المكان: ${name}
المدينة: ${city}
التصنيف: ${category}
الوصف: ${description || 'لا يوجد وصف متاح'}
السعر يبدأ من: ${price_from ? `${price_from} دولار` : 'مجاني'}
ساعات العمل: ${opening_hours || 'غير محدد'}

اكتب تعليقًا صوتيًا من 4 إلى 6 جمل فقط. ابدأ بترحيب بالزائر. اجعله حيويًا وشيقًا. لا تستخدم نقاطًا أو عناوين — فقط نص متواصل يُقرأ بصوت عالٍ.`
      : `You are a professional Egyptian tour guide. Write a short, engaging audio guide script in English for this attraction to be used in a tourism app.

Attraction: ${name}
City: ${city}
Category: ${category}
Description: ${description || 'No description available'}
Price from: ${price_from ? `$${price_from}` : 'Free'}
Opening hours: ${opening_hours || 'Not specified'}

Write 4 to 6 sentences only. Start by welcoming the visitor to the attraction. Make it vivid and engaging. No bullet points or headers — just flowing text meant to be read aloud.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const groqData = await groqResponse.json();

    if (!groqData.choices || !groqData.choices[0]) {
      console.error('Groq TTS script error:', JSON.stringify(groqData));
      return res.status(500).json({ success: false, message: 'Failed to generate tour script' });
    }

    const script = groqData.choices[0].message.content.trim();

    // ── Step 2: Convert script to audio via ElevenLabs ─────────────
    const voiceId = VOICES[language] ?? VOICES.en;

    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenResponse.ok) {
      const errText = await elevenResponse.text();
      console.error('ElevenLabs error:', errText);
      return res.status(500).json({ success: false, message: 'Failed to generate audio' });
    }

    // Convert audio buffer to base64
    const audioBuffer = await elevenResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    res.json({
      success: true,
      audio: base64Audio,
      script,
    });

  } catch (err) {
    console.error('TTS route error:', err);
    res.status(500).json({ success: false, message: 'TTS service error' });
  }
});

export default router;