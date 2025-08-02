export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321 limit
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  if (phone.length > 20) return false; // Reasonable limit
  
  // Enhanced phone number validation
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
  return phoneRegex.test(cleanPhone);
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  // Check for special characters
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
};

export const validateBase64Image = (base64String: string): boolean => {
  try {
    if (!base64String || typeof base64String !== 'string') return false;
    if (base64String.length > 10 * 1024 * 1024) return false; // 10MB limit
    
    // Check if it's a valid base64 string with proper MIME type
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Regex.test(base64String)) {
      return false;
    }
    
    // Extract the base64 data part
    const base64Data = base64String.split(',')[1];
    
    if (!base64Data || base64Data.length === 0) return false;
    
    // Check if it's valid base64
    const decoded = Buffer.from(base64Data, 'base64');
    const reencoded = decoded.toString('base64');
    
    // Additional size check after decoding
    if (decoded.length > 5 * 1024 * 1024) return false; // 5MB decoded limit
    
    return reencoded === base64Data;
  } catch (error) {
    return false;
  }
};

export const validatePropertyImages = (images: string[]): { isValid: boolean; message?: string } => {
  if (!Array.isArray(images)) {
    return { isValid: false, message: 'Images must be an array' };
  }
  
  if (images.length < 3 || images.length > 4) {
    return { isValid: false, message: 'Property must have 3-4 images' };
  }
  
  for (let i = 0; i < images.length; i++) {
    if (!validateBase64Image(images[i])) {
      return { isValid: false, message: `Image ${i + 1} is not a valid base64 image` };
    }
  }
  
  return { isValid: true };
};

export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags, script tags, and dangerous characters
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Additional validation utilities
export const validateStringLength = (str: string, min: number, max: number): boolean => {
  if (!str || typeof str !== 'string') return false;
  return str.length >= min && str.length <= max;
};

export const validateNumericRange = (num: number, min?: number, max?: number): boolean => {
  if (typeof num !== 'number' || isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

export const validateId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;
  // Check if it looks like a valid UUID or MongoDB ObjectId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return uuidRegex.test(id) || objectIdRegex.test(id);
};
