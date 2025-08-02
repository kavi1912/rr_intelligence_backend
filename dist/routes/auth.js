"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.authRoutes = router;
router.post('/signup', authController_1.signUp);
router.post('/signin', authController_1.signIn);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
router.put('/profile', auth_1.authenticateToken, authController_1.updateProfile);
//# sourceMappingURL=auth.js.map