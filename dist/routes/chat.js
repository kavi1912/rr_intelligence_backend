"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.chatRoutes = router;
router.post('/message', chatController_1.saveChatMessage);
router.get('/history/:telegramUserId', chatController_1.getChatHistoryByTelegramUserId);
router.get('/summary/:telegramUserId', chatController_1.getChatSummary);
router.get('/active-sessions', auth_1.authenticateToken, chatController_1.getActiveChatSessions);
router.get('/search', auth_1.authenticateToken, chatController_1.searchChatHistory);
router.delete('/history/:telegramUserId', auth_1.authenticateToken, chatController_1.deleteChatHistory);
//# sourceMappingURL=chat.js.map