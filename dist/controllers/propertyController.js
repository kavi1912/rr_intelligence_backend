"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProperties = exports.deleteProperty = exports.updateProperty = exports.createProperty = exports.getPropertyById = exports.getAllProperties = void 0;
const database_1 = require("../utils/database");
const errorHandler_1 = require("../middleware/errorHandler");
const validation_1 = require("../utils/validation");
exports.getAllProperties = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search, propertyType, minPrice, maxPrice, minArea, maxArea, bedrooms, bathrooms, location, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const where = {
        isActive: true
    };
    if (search) {
        const searchTerm = (0, validation_1.sanitizeInput)(search);
        where.OR = [
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { location: { contains: searchTerm, mode: 'insensitive' } },
            { propertyType: { contains: searchTerm, mode: 'insensitive' } }
        ];
    }
    if (propertyType) {
        where.propertyType = { contains: (0, validation_1.sanitizeInput)(propertyType), mode: 'insensitive' };
    }
    if (location) {
        where.location = { contains: (0, validation_1.sanitizeInput)(location), mode: 'insensitive' };
    }
    if (minPrice || maxPrice) {
        where.pricePerSqft = {};
        if (minPrice) {
            where.pricePerSqft.gte = parseFloat(minPrice);
        }
        if (maxPrice) {
            where.pricePerSqft.lte = parseFloat(maxPrice);
        }
    }
    if (minArea || maxArea) {
        where.area = {};
        if (minArea) {
            where.area.gte = parseFloat(minArea);
        }
        if (maxArea) {
            where.area.lte = parseFloat(maxArea);
        }
    }
    if (bedrooms) {
        where.bedrooms = parseInt(bedrooms, 10);
    }
    if (bathrooms) {
        where.bathrooms = parseInt(bathrooms, 10);
    }
    const [properties, totalCount] = await Promise.all([
        database_1.prisma.property.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        companyName: true
                    }
                }
            }
        }),
        database_1.prisma.property.count({ where })
    ]);
    res.json({
        properties,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
        }
    });
});
exports.getPropertyById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const property = await database_1.prisma.property.findFirst({
        where: {
            id,
            isActive: true
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    companyName: true,
                    phoneNumber: true,
                    email: true
                }
            }
        }
    });
    if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
    }
    res.json({ property });
});
exports.createProperty = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const { images, description, pricePerSqft, location, contactInfo, propertyType, area, bedrooms, bathrooms } = req.body;
    if (!images || !description || !pricePerSqft || !location || !contactInfo) {
        res.status(400).json({
            error: 'Images, description, price per sqft, location, and contact info are required'
        });
        return;
    }
    const imageValidation = (0, validation_1.validatePropertyImages)(images);
    if (!imageValidation.isValid) {
        res.status(400).json({ error: imageValidation.message });
        return;
    }
    if (pricePerSqft <= 0) {
        res.status(400).json({ error: 'Price per sqft must be greater than 0' });
        return;
    }
    if (area !== undefined && area <= 0) {
        res.status(400).json({ error: 'Area must be greater than 0' });
        return;
    }
    if (bedrooms !== undefined && (bedrooms < 0 || !Number.isInteger(bedrooms))) {
        res.status(400).json({ error: 'Bedrooms must be a non-negative integer' });
        return;
    }
    if (bathrooms !== undefined && (bathrooms < 0 || !Number.isInteger(bathrooms))) {
        res.status(400).json({ error: 'Bathrooms must be a non-negative integer' });
        return;
    }
    const property = await database_1.prisma.property.create({
        data: {
            userId,
            images,
            description: (0, validation_1.sanitizeInput)(description),
            pricePerSqft,
            location: (0, validation_1.sanitizeInput)(location),
            contactInfo: (0, validation_1.sanitizeInput)(contactInfo),
            ...(propertyType && { propertyType: (0, validation_1.sanitizeInput)(propertyType) }),
            ...(area !== undefined && { area }),
            ...(bedrooms !== undefined && { bedrooms }),
            ...(bathrooms !== undefined && { bathrooms })
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    companyName: true
                }
            }
        }
    });
    res.status(201).json({
        message: 'Property created successfully',
        property
    });
});
exports.updateProperty = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const { images, description, pricePerSqft, location, contactInfo, propertyType, area, bedrooms, bathrooms } = req.body;
    const existingProperty = await database_1.prisma.property.findFirst({
        where: {
            id,
            userId,
            isActive: true
        }
    });
    if (!existingProperty) {
        res.status(404).json({ error: 'Property not found or access denied' });
        return;
    }
    if (images) {
        const imageValidation = (0, validation_1.validatePropertyImages)(images);
        if (!imageValidation.isValid) {
            res.status(400).json({ error: imageValidation.message });
            return;
        }
    }
    if (pricePerSqft !== undefined && pricePerSqft <= 0) {
        res.status(400).json({ error: 'Price per sqft must be greater than 0' });
        return;
    }
    if (area !== undefined && area <= 0) {
        res.status(400).json({ error: 'Area must be greater than 0' });
        return;
    }
    if (bedrooms !== undefined && (bedrooms < 0 || !Number.isInteger(bedrooms))) {
        res.status(400).json({ error: 'Bedrooms must be a non-negative integer' });
        return;
    }
    if (bathrooms !== undefined && (bathrooms < 0 || !Number.isInteger(bathrooms))) {
        res.status(400).json({ error: 'Bathrooms must be a non-negative integer' });
        return;
    }
    const updatedProperty = await database_1.prisma.property.update({
        where: { id },
        data: {
            ...(images && { images }),
            ...(description && { description: (0, validation_1.sanitizeInput)(description) }),
            ...(pricePerSqft !== undefined && { pricePerSqft }),
            ...(location && { location: (0, validation_1.sanitizeInput)(location) }),
            ...(contactInfo && { contactInfo: (0, validation_1.sanitizeInput)(contactInfo) }),
            ...(propertyType && { propertyType: (0, validation_1.sanitizeInput)(propertyType) }),
            ...(area !== undefined && { area }),
            ...(bedrooms !== undefined && { bedrooms }),
            ...(bathrooms !== undefined && { bathrooms })
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    companyName: true
                }
            }
        }
    });
    res.json({
        message: 'Property updated successfully',
        property: updatedProperty
    });
});
exports.deleteProperty = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const existingProperty = await database_1.prisma.property.findFirst({
        where: {
            id,
            userId,
            isActive: true
        }
    });
    if (!existingProperty) {
        res.status(404).json({ error: 'Property not found or access denied' });
        return;
    }
    await database_1.prisma.property.update({
        where: { id },
        data: { isActive: false }
    });
    res.json({ message: 'Property deleted successfully' });
});
exports.getUserProperties = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    const { page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    const [properties, totalCount] = await Promise.all([
        database_1.prisma.property.findMany({
            where: {
                userId,
                isActive: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limitNum
        }),
        database_1.prisma.property.count({
            where: {
                userId,
                isActive: true
            }
        })
    ]);
    res.json({
        properties,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            pages: Math.ceil(totalCount / limitNum)
        }
    });
});
//# sourceMappingURL=propertyController.js.map