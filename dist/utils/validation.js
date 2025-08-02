"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateId = exports.validateNumericRange = exports.validateStringLength = exports.sanitizeInput = exports.validatePropertyImages = exports.validateBase64Image = exports.validatePassword = exports.validatePhoneNumber = exports.validateEmail = void 0;
const validateEmail = (email) => {
    if (!email || typeof email !== 'string')
        return false;
    if (email.length > 254)
        return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string')
        return false;
    if (phone.length > 20)
        return false;
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
    return phoneRegex.test(cleanPhone);
};
exports.validatePhoneNumber = validatePhoneNumber;
const validatePassword = (password) => {
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
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one special character' };
    }
    return { isValid: true };
};
exports.validatePassword = validatePassword;
const validateBase64Image = (base64String) => {
    try {
        if (!base64String || typeof base64String !== 'string')
            return false;
        if (base64String.length > 10 * 1024 * 1024)
            return false;
        const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
        if (!base64Regex.test(base64String)) {
            return false;
        }
        const base64Data = base64String.split(',')[1];
        if (!base64Data || base64Data.length === 0)
            return false;
        const decoded = Buffer.from(base64Data, 'base64');
        const reencoded = decoded.toString('base64');
        if (decoded.length > 5 * 1024 * 1024)
            return false;
        return reencoded === base64Data;
    }
    catch (error) {
        return false;
    }
};
exports.validateBase64Image = validateBase64Image;
const validatePropertyImages = (images) => {
    if (!Array.isArray(images)) {
        return { isValid: false, message: 'Images must be an array' };
    }
    if (images.length < 3 || images.length > 4) {
        return { isValid: false, message: 'Property must have 3-4 images' };
    }
    for (let i = 0; i < images.length; i++) {
        if (!(0, exports.validateBase64Image)(images[i])) {
            return { isValid: false, message: `Image ${i + 1} is not a valid base64 image` };
        }
    }
    return { isValid: true };
};
exports.validatePropertyImages = validatePropertyImages;
const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string')
        return '';
    return input
        .trim()
        .replace(/<[^>]*>/g, '')
        .replace(/[<>'"&]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .substring(0, 1000);
};
exports.sanitizeInput = sanitizeInput;
const validateStringLength = (str, min, max) => {
    if (!str || typeof str !== 'string')
        return false;
    return str.length >= min && str.length <= max;
};
exports.validateStringLength = validateStringLength;
const validateNumericRange = (num, min, max) => {
    if (typeof num !== 'number' || isNaN(num))
        return false;
    if (min !== undefined && num < min)
        return false;
    if (max !== undefined && num > max)
        return false;
    return true;
};
exports.validateNumericRange = validateNumericRange;
const validateId = (id) => {
    if (!id || typeof id !== 'string')
        return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return uuidRegex.test(id) || objectIdRegex.test(id);
};
exports.validateId = validateId;
//# sourceMappingURL=validation.js.map