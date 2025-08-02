"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        const message = update.message;
        if (!message || !message.from || !message.text) {
            return res.sendStatus(200);
        }
        const telegramUserId = String(message.from.id);
        const userText = message.text.trim();
        const language = message.from.language_code || 'en';
        await prisma.chatHistory.create({
            data: {
                telegramUserId,
                message: userText,
                messageType: 'text',
                language,
            },
        });
        let botResponse = "Hi! I'm your RealYAI assistant. How can I help you with real estate today?";
        let leadStatus = undefined;
        let followUpActivity = undefined;
        let contactInfo = undefined;
        let phoneNumber = undefined;
        let leadData = {};
        function isValidContact(text) {
            const phoneRegex = /\+?\d{8,}/;
            if (phoneRegex.test(text)) {
                phoneNumber = text.match(phoneRegex)?.[0];
            }
            return !!phoneNumber;
        }
        if (/office|workspace|small office/i.test(userText)) {
            botResponse = "Perfect! 🚀 What office size do you need (in sq.m)?";
            leadStatus = 'MEDIUM';
        }
        else if (/\d+\s*sq.?m|\d+\s*sqm/i.test(userText)) {
            botResponse = "What’s your monthly budget?";
            leadStatus = 'MEDIUM';
        }
        else if (/\$\d+|\d+\s*usd|budget/i.test(userText)) {
            botResponse = "Do you need it furnished?";
            leadStatus = 'MEDIUM';
        }
        else if (/furnished|yes|no/i.test(userText) && /furnish/i.test(userText)) {
            botResponse = "We have a 50 sq.m furnished office in Telunage for $950/month. Want to see some images?";
            leadStatus = 'MEDIUM';
        }
        else if (/send|image|photo|pic/i.test(userText)) {
            botResponse = "(Sends images)\nI wish to visit this place?";
            leadStatus = 'MEDIUM';
        }
        else if (/visit|see|schedule/i.test(userText)) {
            botResponse = "Please share your WhatsApp or email so our experts can contact you.";
            leadStatus = 'HIGH';
            followUpActivity = 'Visit Requested';
        }
        else if (isValidContact(userText)) {
            botResponse = "Thank you! Our team will reach out to schedule your visit.";
            contactInfo = userText;
            leadStatus = 'HIGH';
            followUpActivity = 'Visit Requested';
        }
        else if (/market|trend|price|dubai|report|guide/i.test(userText)) {
            botResponse = "Here’s a quick snapshot: construction up 8%, avg. price AED 1,500/sq.ft, rental yields up to 7.2%. Want a free investment guide PDF?";
            leadStatus = 'MEDIUM';
        }
        else if (/yes|send guide|get guide/i.test(userText) && /guide|pdf|report/i.test(userText)) {
            botResponse = "Please share your email or WhatsApp to send the guide.";
            leadStatus = 'MEDIUM';
            followUpActivity = 'Guide Sent';
        }
        else if (/investor|roi|return/i.test(userText)) {
            botResponse = "What’s your investment range?";
            leadStatus = 'HIGH';
        }
        else if (/\$\d+|\d+\s*usd|range/i.test(userText) && /invest/i.test(userText)) {
            botResponse = "Are you looking for rental income or flip deals?";
            leadStatus = 'HIGH';
        }
        else if (/rental|flip/i.test(userText)) {
            botResponse = "Which cities interest you most?";
            leadStatus = 'HIGH';
        }
        else if (/lima|santiago|city/i.test(userText) && /invest/i.test(userText)) {
            botResponse = "Please share your WhatsApp or email for a curated list.";
            leadStatus = 'HIGH';
            followUpActivity = 'Investor Lead';
        }
        else if (/us|usa|international|abroad/i.test(userText) && /buy|invest/i.test(userText)) {
            botResponse = "Yes! What’s your budget and do you need legal help?";
            leadStatus = 'HIGH';
        }
        else if (/legal|help|lawyer/i.test(userText)) {
            botResponse = "Please share your WhatsApp or email so our specialist can assist you.";
            leadStatus = 'HIGH';
            followUpActivity = 'International Buyer';
        }
        else if (/builder|partner|list project/i.test(userText)) {
            botResponse = "What type of projects and which cities do you cover?";
            leadStatus = 'HIGH';
        }
        else if (/residential|commercial|unit|city/i.test(userText) && /project|build/i.test(userText)) {
            botResponse = "How many units available now?";
            leadStatus = 'HIGH';
        }
        else if (/\d+\s*unit/i.test(userText)) {
            botResponse = "Please share your company name and contact info.";
            leadStatus = 'HIGH';
            followUpActivity = 'Builder Inquiry';
        }
        else if (/worth|valuation|estimate/i.test(userText)) {
            botResponse = "Where is it located and what’s the size?";
            leadStatus = 'MEDIUM';
        }
        else if (/callao|lima|santiago/i.test(userText) && /\d+\s*sq.?m/i.test(userText)) {
            botResponse = "Is it residential or commercial?";
            leadStatus = 'MEDIUM';
        }
        else if (/residential|commercial/i.test(userText) && /valuation|estimate/i.test(userText)) {
            botResponse = "Here’s an estimate: $220,000–$240,000. Want a detailed report to your WhatsApp or email?";
            leadStatus = 'MEDIUM';
            followUpActivity = 'Valuation Report';
        }
        else if (/free|investment guide|download/i.test(userText)) {
            botResponse = "Please provide your WhatsApp or email to receive the guide.";
            leadStatus = 'NOT_QUALIFIED';
        }
        else if (/no thanks|just browsing|not now/i.test(userText)) {
            botResponse = "No problem! Let me know if you want more info anytime.";
            leadStatus = 'NOT_QUALIFIED';
        }
        else if (/favorite color|time pass|bored/i.test(userText)) {
            botResponse = "I’m here to help you with real estate questions! Looking for a property or market info?";
            leadStatus = 'NOT_QUALIFIED';
        }
        if (leadStatus && leadStatus !== 'NOT_QUALIFIED') {
            let lead = await prisma.lead.findFirst({ where: { telegramUserId } });
            if (lead) {
                lead = await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        status: leadStatus,
                        phoneNumber: phoneNumber || lead.phoneNumber || undefined,
                    },
                });
            }
            else {
                lead = await prisma.lead.create({
                    data: {
                        telegramUserId,
                        status: leadStatus,
                        phoneNumber: phoneNumber || undefined,
                    },
                });
            }
            if (followUpActivity) {
                await prisma.followUp.create({
                    data: {
                        leadId: lead.id,
                        activity: followUpActivity,
                        status: 'PENDING',
                    },
                });
            }
        }
        await prisma.chatHistory.create({
            data: {
                telegramUserId,
                message: userText,
                response: botResponse,
                messageType: 'text',
                language,
            },
        });
        return res.sendStatus(200);
    }
    catch (error) {
        console.error('Telegram webhook error:', error);
        return res.sendStatus(200);
    }
});
exports.default = router;
//# sourceMappingURL=telegram.js.map