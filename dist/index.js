"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("./routes/auth");
const leads_1 = require("./routes/leads");
const properties_1 = require("./routes/properties");
const stats_1 = require("./routes/stats");
const chat_1 = require("./routes/chat");
const mockAuth_1 = require("./routes/mockAuth");
const telegramNew_1 = require("./routes/telegramNew");
const errorHandler_1 = require("./middleware/errorHandler");
const telegramService_1 = require("./services/telegramService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(limiter);
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
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
app.use('/api/mock', mockAuth_1.mockAuthRoutes);
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/leads', leads_1.leadRoutes);
app.use('/api/properties', properties_1.propertyRoutes);
app.use('/api/stats', stats_1.statsRoutes);
app.use('/api/chat', chat_1.chatRoutes);
app.use('/api/telegram', telegramNew_1.telegramRoutes);
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
async function startServer() {
    try {
        telegramService_1.telegramService.startBot();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔒 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🤖 Telegram Bot: Active and listening`);
            console.log(`🗄️ Database: Railway PostgreSQL`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    telegramService_1.telegramService.stopBot();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    telegramService_1.telegramService.stopBot();
    process.exit(0);
});
startServer();
//# sourceMappingURL=index.js.map