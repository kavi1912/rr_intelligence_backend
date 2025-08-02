"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRoutes = void 0;
const express_1 = require("express");
const statsController_1 = require("../controllers/statsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.statsRoutes = router;
router.use(auth_1.authenticateToken);
router.get('/daily', statsController_1.getDailyStats);
router.get('/weekly', statsController_1.getWeeklyStats);
router.get('/monthly', statsController_1.getMonthlyStats);
router.get('/dashboard', statsController_1.getDashboardStats);
router.get('/custom', statsController_1.getCustomStats);
//# sourceMappingURL=stats.js.map