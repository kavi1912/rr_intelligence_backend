"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramRoutes = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const telegramService_1 = require("../services/telegramService");
const router = express_1.default.Router();
exports.telegramRoutes = router;
const prisma = new client_1.PrismaClient();
router.post('/webhook', async (req, res) => {
    try {
        console.log('Received webhook update:', JSON.stringify(req.body, null, 2));
        return res.sendStatus(200);
    }
    catch (error) {
        console.error('Telegram webhook error:', error);
        return res.sendStatus(200);
    }
});
router.get('/bot-info', async (req, res) => {
    try {
        const botInfo = await telegramService_1.telegramService.bot.getMe();
        res.json({
            status: 'active',
            bot_username: botInfo.username,
            bot_id: botInfo.id,
            is_bot: botInfo.is_bot
        });
    }
    catch (error) {
        console.error('Error getting bot info:', error);
        res.status(500).json({
            error: 'Failed to get bot information',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalUsers, activeUsersToday, totalMessages, leadsByStatus] = await Promise.all([
            prisma.chatHistory.findMany({
                distinct: ['telegramUserId'],
                select: { telegramUserId: true }
            }).then(users => users.length),
            prisma.chatHistory.findMany({
                where: { timestamp: { gte: today } },
                distinct: ['telegramUserId'],
                select: { telegramUserId: true }
            }).then(users => users.length),
            prisma.chatHistory.count(),
            prisma.lead.groupBy({
                by: ['status'],
                _count: { status: true }
            })
        ]);
        const leadDistribution = leadsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {});
        res.json({
            total_users: totalUsers,
            active_users_today: activeUsersToday,
            total_messages: totalMessages,
            leads_by_status: leadDistribution
        });
    }
    catch (error) {
        console.error('Error getting Telegram stats:', error);
        res.status(500).json({
            error: 'Failed to get statistics',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
//# sourceMappingURL=telegramNew.js.map