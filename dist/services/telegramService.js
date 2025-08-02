"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramService = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const generative_ai_1 = require("@google/generative-ai");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
class TelegramBotServiceImpl {
    constructor() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        this.bot = new node_telegram_bot_api_1.default(token, { polling: true });
        this.model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        });
        this.setupHandlers();
    }
    setupHandlers() {
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const telegramUserId = String(msg.from?.id || '');
            const welcomeMessage = `🏠 Welcome to RRintelligence CRM!
      
I'm your AI real estate assistant. I can help you with:
• Finding properties for sale or rent
• Property valuations and market insights
• Investment opportunities and ROI analysis
• Scheduling property visits
• Connecting with our expert agents

How can I assist you today?`;
            await this.sendMessage(chatId, welcomeMessage);
            await this.logChatHistory(telegramUserId, '/start', welcomeMessage);
        });
        this.bot.on('message', async (msg) => {
            if (msg.text?.startsWith('/'))
                return;
            const chatId = msg.chat.id;
            const telegramUserId = String(msg.from?.id || '');
            const userMessage = msg.text || '';
            try {
                const aiResponse = await this.generateAIResponse(userMessage, telegramUserId);
                await this.sendMessage(chatId, aiResponse);
                await this.logChatHistory(telegramUserId, userMessage, aiResponse);
                await this.updateLead(telegramUserId, userMessage, aiResponse);
            }
            catch (error) {
                console.error('Error handling message:', error);
                await this.sendMessage(chatId, 'Sorry, I encountered an error. Please try again later.');
            }
        });
        this.bot.on('error', (error) => {
            console.error('Telegram bot error:', error);
        });
    }
    async generateAIResponse(userMessage, telegramUserId) {
        try {
            const recentHistory = await prisma.chatHistory.findMany({
                where: { telegramUserId },
                orderBy: { timestamp: 'desc' },
                take: 5
            });
            const propertyCount = await prisma.property.count({ where: { isActive: true } });
            const context = `You are RRintelligence CRM's AI assistant for real estate. 
IMPORTANT: Use web search to get current market data, property prices, and real estate trends when relevant.      
User's recent conversation:
${recentHistory.map(h => `User: ${h.message}\nBot: ${h.response || 'No response'}`).join('\n')}

Current database status: ${propertyCount > 0 ? `${propertyCount} active properties available` : 'No properties currently in database'}

Guidelines:
- Be helpful and professional
- Ask qualifying questions (budget, location, property type, size)
- For property searches: ${propertyCount > 0 ? 'offer to show available properties' : 'say "We are updating our property database. Our team will contact you soon with available options."'}
- Always try to collect contact info (WhatsApp/email) for high-intent users
- Classify user intent: HIGH (ready to buy/visit), MEDIUM (researching), LOW (just browsing)
- For property valuations, ask for location and property details
- For investment queries, ask about budget and preferred areas
- Keep responses concise but informative

Current user message: "${userMessage}"

Respond naturally and helpfully:`;
            const result = await this.model.generateContent(context);
            const response = result.response;
            return response.text() || 'I apologize, but I couldn\'t generate a proper response. Please try again.';
        }
        catch (error) {
            console.error('Error generating AI response:', error);
            return 'I apologize for the technical difficulty. Please try again or contact our support team.';
        }
    }
    async logChatHistory(telegramUserId, message, response) {
        try {
            await prisma.chatHistory.create({
                data: {
                    telegramUserId,
                    message,
                    response: response || null,
                    messageType: 'text',
                    language: 'en'
                }
            });
        }
        catch (error) {
            console.error('Error logging chat history:', error);
        }
    }
    async updateLead(telegramUserId, userMessage, botResponse) {
        try {
            const intent = this.analyzeIntent(userMessage, botResponse);
            if (intent.status === 'NOT_QUALIFIED')
                return;
            let lead = await prisma.lead.findFirst({ where: { telegramUserId } });
            if (lead) {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        status: intent.status,
                        phoneNumber: intent.phoneNumber || lead.phoneNumber,
                        budget: intent.budget || lead.budget,
                        expectations: intent.expectations || lead.expectations
                    }
                });
            }
            else {
                lead = await prisma.lead.create({
                    data: {
                        telegramUserId,
                        status: intent.status,
                        phoneNumber: intent.phoneNumber,
                        budget: intent.budget,
                        expectations: intent.expectations
                    }
                });
            }
            if (intent.followUpActivity) {
                await prisma.followUp.create({
                    data: {
                        leadId: lead.id,
                        activity: intent.followUpActivity,
                        status: 'PENDING'
                    }
                });
            }
        }
        catch (error) {
            console.error('Error updating lead:', error);
        }
    }
    analyzeIntent(userMessage, botResponse) {
        const msg = userMessage.toLowerCase();
        const phoneMatch = userMessage.match(/\+?[\d\s\-\(\)]{8,}/);
        const phoneNumber = phoneMatch ? phoneMatch[0].replace(/\s/g, '') : undefined;
        const budgetMatch = userMessage.match(/\$[\d,]+|\d+\s*(?:usd|dollar|k)/i);
        const budget = budgetMatch ? budgetMatch[0] : undefined;
        if (/visit|schedule|appointment|meet|see property|buy now|ready to buy/i.test(msg) || phoneNumber) {
            return {
                status: 'HIGH',
                phoneNumber,
                budget,
                expectations: userMessage,
                followUpActivity: /visit|schedule|appointment/.test(msg) ? 'Property Visit Requested' : 'High Intent Lead'
            };
        }
        if (/budget|price|cost|looking for|interested|want to|need|invest/i.test(msg)) {
            return {
                status: 'MEDIUM',
                phoneNumber,
                budget,
                expectations: userMessage,
                followUpActivity: undefined
            };
        }
        return {
            status: 'NOT_QUALIFIED',
            phoneNumber: undefined,
            budget: undefined,
            expectations: undefined,
            followUpActivity: undefined
        };
    }
    async sendMessage(chatId, text) {
        try {
            await this.bot.sendMessage(chatId, text);
        }
        catch (error) {
            console.error('Error sending message:', error);
        }
    }
    startBot() {
        console.log('🤖 Telegram bot started successfully');
    }
    stopBot() {
        this.bot.stopPolling();
        console.log('🤖 Telegram bot stopped');
    }
}
exports.telegramService = new TelegramBotServiceImpl();
//# sourceMappingURL=telegramService.js.map