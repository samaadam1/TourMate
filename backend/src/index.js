import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import hotelsRouter from './routes/hotels.js';
import aiRouter from './routes/ai.js';
import attractionsRouter from './routes/attractions.js';
import pointsRouter from './routes/points.js';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/attractions', attractionsRouter);
app.use('/api/points', pointsRouter);

app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelsRouter);
app.use('/api/ai', aiRouter);

app.get('/', (req, res) => {
  res.json({ message: 'TourMate API is running' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});