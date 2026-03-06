// backend/src/routes/ai.js
import express from 'express';

const router = express.Router();

const SYSTEM_PROMPT = `You are Tour Mate, an expert Egyptian travel assistant built into the TourMate app. You are friendly, helpful, and knowledgeable about everything related to Egyptian tourism.

You help users with:
- Detailed information about Egyptian historical places (Pyramids, Sphinx, Luxor Temple, Abu Simbel, Valley of the Kings, Citadel of Qaitbay, Library of Alexandria, Roman Amphitheatre, Karnak Temple, and more)
- Suggesting attractions based on user interests (history, diving, food, adventure, culture, shopping, nightlife, family, nature)
- Budget advice and realistic cost estimates for trips in Egypt (entry fees, food costs, transport)
- Recommending authentic local Egyptian food and restaurants
- Packing tips tailored to each Egyptian city and season
- Help planning detailed daily itineraries for Egyptian cities
- Safety tips and important advice for tourists visiting Egypt
- Best times of year to visit each place in Egypt considering weather and crowds

Always be friendly, warm, and helpful. Use emojis to make responses engaging. Give practical, specific advice with real details like prices, opening hours, and insider tips. Keep responses concise but informative. Focus on Egyptian tourism topics.`;

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      res.json({ success: true, message: data.choices[0].message.content });
    } else {
      console.error('Groq response:', JSON.stringify(data));
      res.status(500).json({ success: false, error: 'No response from AI' });
    }
  } catch (err) {
    console.error('AI error:', err);
    res.status(500).json({ success: false, error: 'AI service error' });
  }
});

export default router;