"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockGetStats = exports.mockGetLeads = exports.mockGetProperties = exports.mockGetProfile = exports.mockSignUp = exports.mockSignIn = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
const validation_1 = require("../utils/validation");
const errorHandler_1 = require("../middleware/errorHandler");
let mockUsers = [];
const initializeMockUsers = async () => {
    if (mockUsers.length === 0) {
        const saltRounds = 12;
        mockUsers = [
            {
                id: '1',
                username: 'admin',
                companyName: 'RR Intelligence',
                phoneNumber: '+1234567890',
                email: 'admin@rrcrm.com',
                password: await bcrypt_1.default.hash('admin123', saltRounds),
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '2',
                username: 'demo_user',
                companyName: 'Demo Real Estate',
                phoneNumber: '+9876543210',
                email: 'demo@rrcrm.com',
                password: await bcrypt_1.default.hash('user123', saltRounds),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
    }
};
const mockProperties = [
    {
        id: '1',
        userId: '1',
        images: ['data:image/jpeg;base64,/9j/sample1', 'data:image/jpeg;base64,/9j/sample2'],
        description: 'Beautiful 3-bedroom apartment in downtown with modern amenities',
        pricePerSqft: 250.00,
        location: 'Downtown Mumbai',
        contactInfo: 'admin@rrcrm.com | +1234567890',
        propertyType: 'Apartment',
        area: 1200.00,
        bedrooms: 3,
        bathrooms: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];
const mockLeads = [
    {
        id: '1',
        telegramUserId: '123456789',
        name: 'Rajesh Kumar',
        phoneNumber: '+919876543210',
        budget: 5000000.00,
        expectations: 'Looking for a 3BHK apartment in Mumbai',
        status: 'HIGH',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
    }
];
exports.mockSignIn = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await initializeMockUsers();
    const { email, password } = req.body;
    console.log('Mock SignIn attempt:', { email, password: '***' });
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    if (!(0, validation_1.validateEmail)(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }
    const sanitizedEmail = (0, validation_1.sanitizeInput)(email.toLowerCase());
    const user = mockUsers.find(u => u.email === sanitizedEmail);
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
    console.log('Mock SignIn successful for:', user.email);
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
exports.mockSignUp = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await initializeMockUsers();
    const { username, companyName, phoneNumber, email, password } = req.body;
    console.log('Mock SignUp attempt:', { email, username });
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
    const existingUser = mockUsers.find(u => u.email === sanitizedData.email ||
        u.phoneNumber === sanitizedData.phoneNumber ||
        u.username === sanitizedData.username);
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
    const newUser = {
        id: String(mockUsers.length + 1),
        username: sanitizedData.username,
        companyName: sanitizedData.companyName,
        phoneNumber: sanitizedData.phoneNumber,
        email: sanitizedData.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    mockUsers.push(newUser);
    const token = (0, jwt_1.generateToken)({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
    });
    console.log('Mock SignUp successful for:', newUser.email);
    res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
            id: newUser.id,
            username: newUser.username,
            companyName: newUser.companyName,
            phoneNumber: newUser.phoneNumber,
            email: newUser.email,
            createdAt: newUser.createdAt
        }
    });
});
exports.mockGetProfile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await initializeMockUsers();
    const userId = req.user.id;
    const user = mockUsers.find(u => u.id === userId);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({
        user: {
            id: user.id,
            username: user.username,
            companyName: user.companyName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }
    });
});
exports.mockGetProperties = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        properties: mockProperties,
        total: mockProperties.length,
        page: 1,
        totalPages: 1
    });
});
exports.mockGetLeads = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        leads: mockLeads,
        total: mockLeads.length,
        page: 1,
        totalPages: 1
    });
});
exports.mockGetStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        totalLeads: mockLeads.length,
        totalProperties: mockProperties.length,
        totalUsers: mockUsers.length,
        leadsToday: 1,
        leadsThisWeek: 2,
        leadsThisMonth: 4,
        leadsByStatus: {
            NOT_QUALIFIED: 1,
            MEDIUM: 1,
            HIGH: 2
        }
    });
});
//# sourceMappingURL=mockAuthController.js.map