import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt';
import { SignUpData, SignInData } from '../types';
import { validateEmail, validatePhoneNumber, validatePassword, sanitizeInput } from '../utils/validation';
import { asyncHandler } from '../middleware/errorHandler';

// Mock user data (instead of database)
// Note: Passwords are dynamically hashed on startup for security
let mockUsers: Array<{
  id: string;
  username: string;
  companyName: string;
  phoneNumber: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}> = [];

// Initialize mock users with properly hashed passwords
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
        password: await bcrypt.hash('admin123', saltRounds),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        username: 'demo_user',
        companyName: 'Demo Real Estate',
        phoneNumber: '+9876543210',
        email: 'demo@rrcrm.com',
        password: await bcrypt.hash('user123', saltRounds),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
};

// Mock properties data
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

// Mock leads data
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

export const mockSignIn = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await initializeMockUsers(); // Ensure users are initialized
  const { email, password }: SignInData = req.body;

  console.log('Mock SignIn attempt:', { email, password: '***' });

  // Validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  if (!validateEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  const sanitizedEmail = sanitizeInput(email.toLowerCase());

  // Find user in mock data
  const user = mockUsers.find(u => u.email === sanitizedEmail);

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Generate JWT token
  const token = generateToken({
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

export const mockSignUp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await initializeMockUsers(); // Ensure users are initialized
  const { username, companyName, phoneNumber, email, password }: SignUpData = req.body;

  console.log('Mock SignUp attempt:', { email, username });

  // Validation
  if (!username || !companyName || !phoneNumber || !email || !password) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  if (!validateEmail(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  if (!validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ error: 'Invalid phone number format' });
    return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    res.status(400).json({ error: passwordValidation.message });
    return;
  }

  // Sanitize inputs
  const sanitizedData = {
    username: sanitizeInput(username),
    companyName: sanitizeInput(companyName),
    phoneNumber: sanitizeInput(phoneNumber),
    email: sanitizeInput(email.toLowerCase()),
    password
  };

  // Check if user already exists
  const existingUser = mockUsers.find(u => 
    u.email === sanitizedData.email || 
    u.phoneNumber === sanitizedData.phoneNumber || 
    u.username === sanitizedData.username
  );

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

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(sanitizedData.password, saltRounds);

  // Create new user (add to mock data)
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

  // Generate JWT token
  const token = generateToken({
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

export const mockGetProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await initializeMockUsers(); // Ensure users are initialized
  const userId = (req as any).user.id;

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

// Mock endpoints for dashboard data
export const mockGetProperties = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.json({
    properties: mockProperties,
    total: mockProperties.length,
    page: 1,
    totalPages: 1
  });
});

export const mockGetLeads = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  res.json({
    leads: mockLeads,
    total: mockLeads.length,
    page: 1,
    totalPages: 1
  });
});

export const mockGetStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
