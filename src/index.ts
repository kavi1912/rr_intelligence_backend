import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth';
import { leadRoutes } from './routes/leads';
import { propertyRoutes } from './routes/properties';
import { statsRoutes } from './routes/stats';
import { chatRoutes } from './routes/chat';
import { mockAuthRoutes } from './routes/mockAuth';
import { telegramRoutes } from './routes/telegramNew';
import telegramConfigRoutes from './routes/telegram';
import { errorHandler } from './middleware/errorHandler';
// Removed complex connection management that was causing startup issues
import { telegramService } from './services/telegramService';
import { multiUserTelegramService } from './services/multiUserTelegramService';
// import { redisService } from './services/redisService';
// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Trust proxy for Cloud Run and other reverse proxies
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins (for development)
  credentials: true
}));

app.use(limiter);
app.use(express.json({ limit: '50mb' })); // Large limit for Base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Simplified production setup - removed complex connection cleanup

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'RRintelligence CRM API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth (POST /signup, POST /signin, GET /profile)',
      leads: '/api/leads (GET, POST, PUT, DELETE)',
      properties: '/api/properties (GET, POST, PUT, DELETE)',
      stats: '/api/stats (GET /daily, /weekly, /monthly)',
      chat: '/api/chat (GET /history/:userId, POST /message)',
      telegram: '/api/telegram (POST /webhook, GET /bot-info, GET /stats)'
    },
    health: '/health'
  });
});

// Mock routes (working without database)
app.use('/api/mock', mockAuthRoutes);

// Original routes (with database - may have connection issues)
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/telegram-config', telegramConfigRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    // Start HTTP server first
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔒 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Database: Railway PostgreSQL`);
      console.log(`💾 Database: Connection pooling enabled`);
      
      // Initialize Telegram Bot system after server is listening
      try {
        // Initialize multi-user Telegram service
        console.log(`🤖 Starting Multi-User Telegram Bot System...`);
        await multiUserTelegramService.initializeAllUserBots();
        console.log(`🤖 Multi-User Telegram Bot System: Active with ${multiUserTelegramService.getActiveBotCount()} active bots`);
        
        // Keep the original bot as fallback (optional)
        const enableFallbackBot = false; // Set to true if you want the original bot too
        if (enableFallbackBot && process.env.TELEGRAM_BOT_TOKEN) {
          telegramService.startBot();
          console.log(`🤖 Fallback Telegram Bot: Active and listening`);
        }
      } catch (botError) {
        console.warn('Telegram bot system failed to start:', botError);
        console.log(`🤖 Telegram Bot System: Disabled due to error`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await multiUserTelegramService.stopAllBots();
  telegramService.stopBot();
  // await redisService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await multiUserTelegramService.stopAllBots();
  telegramService.stopBot();
  // await redisService.disconnect();
  process.exit(0);
});

startServer();
