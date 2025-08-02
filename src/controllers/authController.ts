import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/database';
import { generateToken } from '../utils/jwt';
import { SignUpData, SignInData } from '../types';
import { validateEmail, validatePhoneNumber, validatePassword, sanitizeInput } from '../utils/validation';
import { asyncHandler } from '../middleware/errorHandler';

export const signUp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { username, companyName, phoneNumber, email, password }: SignUpData = req.body;

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
  const existingUser = await prisma.user.findFirst({
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

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(sanitizedData.password, saltRounds);

  // Create user
  const user = await prisma.user.create({
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

  // Generate JWT token
  const token = generateToken({
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

export const signIn = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password }: SignInData = req.body;

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

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: sanitizedEmail }
  });

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

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;

  const user = await prisma.user.findUnique({
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

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;
  const { username, companyName, phoneNumber } = req.body;

  // Validate inputs if provided
  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ error: 'Invalid phone number format' });
    return;
  }

  // Check if username or phone is already taken by another user
  if (username || phoneNumber) {
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              ...(username ? [{ username: sanitizeInput(username) }] : []),
              ...(phoneNumber ? [{ phoneNumber: sanitizeInput(phoneNumber) }] : [])
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

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username: sanitizeInput(username) }),
      ...(companyName && { companyName: sanitizeInput(companyName) }),
      ...(phoneNumber && { phoneNumber: sanitizeInput(phoneNumber) })
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

// Forgot Password - Verify user details
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, phoneNumber, companyName } = req.body;

  // Validation
  if (!email || !phoneNumber || !companyName) {
    res.status(400).json({ error: 'Email, phone number, and company name are required' });
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

  // Sanitize inputs
  const sanitizedData = {
    email: sanitizeInput(email.toLowerCase()),
    phoneNumber: sanitizeInput(phoneNumber),
    companyName: sanitizeInput(companyName)
  };

  // Find user with matching details
  const user = await prisma.user.findFirst({
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

  // Return success with user info (without sensitive data)
  res.json({
    message: 'Account verified successfully. You can now reset your password.',
    userId: user.id,
    username: user.username,
    email: user.email
  });
});

// Reset Password - Set new password after verification
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { userId, newPassword, confirmPassword } = req.body;

  // Validation
  if (!userId || !newPassword || !confirmPassword) {
    res.status(400).json({ error: 'User ID, new password, and password confirmation are required' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    res.status(400).json({ error: passwordValidation.message });
    return;
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true }
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Hash new password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  res.json({
    message: 'Password reset successfully. You can now sign in with your new password.'
  });
});
