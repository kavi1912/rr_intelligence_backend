"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.updateProfile = exports.getProfile = exports.signIn = exports.signUp = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const database_1 = require("../utils/database");
const jwt_1 = require("../utils/jwt");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../middleware/errorHandler");
exports.signUp = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { username, companyName, phoneNumber, email, password } = req.body;
    if (!username || !companyName || !phoneNumber || !email || !password) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }
    if (!(0, validation_1.validateEmail)(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }
    if (!(0, validation_1.validatePhoneNumber)(phoneNumber)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
    }
    const passwordValidation = (0, validation_1.validatePassword)(password);
    if (!passwordValidation.isValid) {
        res.status(400).json({ error: passwordValidation.message });
        return;
    }
    const sanitizedData = {
        username: (0, validation_1.sanitizeInput)(username),
        companyName: (0, validation_1.sanitizeInput)(companyName),
        phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber),
        email: (0, validation_1.sanitizeInput)(email.toLowerCase()),
        password
    };
    const existingUser = await database_1.prisma.user.findFirst({
        where: {
            OR: [
                { email: sanitizedData.email },
                { phoneNumber: sanitizedData.phoneNumber },
                { username: sanitizedData.username }
            ]
        }
    });
    if (existingUser) {
        if (existingUser.email === sanitizedData.email) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        if (existingUser.phoneNumber === sanitizedData.phoneNumber) {
            res.status(409).json({ error: 'Phone number already registered' });
            return;
        }
        if (existingUser.username === sanitizedData.username) {
            res.status(409).json({ error: 'Username already taken' });
            return;
        }
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt_1.default.hash(sanitizedData.password, saltRounds);
    const user = await database_1.prisma.user.create({
        data: {
            username: sanitizedData.username,
            companyName: sanitizedData.companyName,
            phoneNumber: sanitizedData.phoneNumber,
            email: sanitizedData.email,
            password: hashedPassword
        },
        select: {
            id: true,
            username: true,
            companyName: true,
            phoneNumber: true,
            email: true,
            createdAt: true
        }
    });
    const token = (0, jwt_1.generateToken)({
        id: user.id,
        email: user.email,
        username: user.username
    });
    res.status(201).json({
        message: 'User registered successfully',
        token,
        user
    });
});
exports.signIn = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    if (!(0, validation_1.validateEmail)(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }
    const sanitizedEmail = (0, validation_1.sanitizeInput)(email.toLowerCase());
    const user = await database_1.prisma.user.findUnique({
        where: { email: sanitizedEmail }
    });
    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const isValidPassword = await bcrypt_1.default.compare(password, user.password);
    if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const token = (0, jwt_1.generateToken)({
        id: user.id,
        email: user.email,
        username: user.username
    });
    res.json({
        message: 'Login successful',
        token,
        user: {
            id: user.id,
            username: user.username,
            companyName: user.companyName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            createdAt: user.createdAt
        }
    });
});
exports.getProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const user = await database_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            companyName: true,
            phoneNumber: true,
            email: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ user });
});
exports.updateProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { username, companyName, phoneNumber } = req.body;
    if (phoneNumber && !(0, validation_1.validatePhoneNumber)(phoneNumber)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
    }
    if (username || phoneNumber) {
        const existingUser = await database_1.prisma.user.findFirst({
            where: {
                AND: [
                    { id: { not: userId } },
                    {
                        OR: [
                            ...(username ? [{ username: (0, validation_1.sanitizeInput)(username) }] : []),
                            ...(phoneNumber ? [{ phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber) }] : [])
                        ]
                    }
                ]
            }
        });
        if (existingUser) {
            if (existingUser.username === username) {
                res.status(409).json({ error: 'Username already taken' });
                return;
            }
            if (existingUser.phoneNumber === phoneNumber) {
                res.status(409).json({ error: 'Phone number already registered' });
                return;
            }
        }
    }
    const updatedUser = await database_1.prisma.user.update({
        where: { id: userId },
        data: {
            ...(username && { username: (0, validation_1.sanitizeInput)(username) }),
            ...(companyName && { companyName: (0, validation_1.sanitizeInput)(companyName) }),
            ...(phoneNumber && { phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber) })
        },
        select: {
            id: true,
            username: true,
            companyName: true,
            phoneNumber: true,
            email: true,
            createdAt: true,
            updatedAt: true
        }
    });
    res.json({
        message: 'Profile updated successfully',
        user: updatedUser
    });
});
exports.forgotPassword = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { email, phoneNumber, companyName } = req.body;
    if (!email || !phoneNumber || !companyName) {
        res.status(400).json({ error: 'Email, phone number, and company name are required' });
        return;
    }
    if (!(0, validation_1.validateEmail)(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }
    if (!(0, validation_1.validatePhoneNumber)(phoneNumber)) {
        res.status(400).json({ error: 'Invalid phone number format' });
        return;
    }
    const sanitizedData = {
        email: (0, validation_1.sanitizeInput)(email.toLowerCase()),
        phoneNumber: (0, validation_1.sanitizeInput)(phoneNumber),
        companyName: (0, validation_1.sanitizeInput)(companyName)
    };
    const user = await database_1.prisma.user.findFirst({
        where: {
            email: sanitizedData.email,
            phoneNumber: sanitizedData.phoneNumber,
            companyName: sanitizedData.companyName
        },
        select: {
            id: true,
            username: true,
            email: true
        }
    });
    if (!user) {
        res.status(404).json({
            error: 'No account found with the provided details. Please check your email, phone number, and company name.'
        });
        return;
    }
    res.json({
        message: 'Account verified successfully. You can now reset your password.',
        userId: user.id,
        username: user.username,
        email: user.email
    });
});
exports.resetPassword = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { userId, newPassword, confirmPassword } = req.body;
    if (!userId || !newPassword || !confirmPassword) {
        res.status(400).json({ error: 'User ID, new password, and password confirmation are required' });
        return;
    }
    if (newPassword !== confirmPassword) {
        res.status(400).json({ error: 'Passwords do not match' });
        return;
    }
    const passwordValidation = (0, validation_1.validatePassword)(newPassword);
    if (!passwordValidation.isValid) {
        res.status(400).json({ error: passwordValidation.message });
        return;
    }
    const user = await database_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
    });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const saltRounds = 12;
    const hashedPassword = await bcrypt_1.default.hash(newPassword, saltRounds);
    await database_1.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });
    res.json({
        message: 'Password reset successfully. You can now sign in with your new password.'
    });
});
//# sourceMappingURL=authController.js.map