"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAuthRoutes = void 0;
const express_1 = require("express");
const mockAuthController_1 = require("../controllers/mockAuthController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.mockAuthRoutes = router;
router.post('/signup', mockAuthController_1.mockSignUp);
router.post('/signin', mockAuthController_1.mockSignIn);
router.get('/profile', auth_1.authenticateToken, mockAuthController_1.mockGetProfile);
router.get('/properties', mockAuthController_1.mockGetProperties);
router.get('/leads', mockAuthController_1.mockGetLeads);
router.get('/stats/overview', mockAuthController_1.mockGetStats);
//# sourceMappingURL=mockAuth.js.map