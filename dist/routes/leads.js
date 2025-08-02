"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadRoutes = void 0;
const express_1 = require("express");
const leadController_1 = require("../controllers/leadController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.leadRoutes = router;
router.post('/', leadController_1.createLead);
router.get('/telegram/:telegramUserId', leadController_1.getLeadsByTelegramUserId);
router.get('/', auth_1.authenticateToken, leadController_1.getAllLeads);
router.get('/:id', auth_1.authenticateToken, leadController_1.getLeadById);
router.patch('/:id/status', auth_1.authenticateToken, leadController_1.updateLeadStatus);
router.put('/:id', auth_1.authenticateToken, leadController_1.updateLead);
router.delete('/:id', auth_1.authenticateToken, leadController_1.deleteLead);
//# sourceMappingURL=leads.js.map