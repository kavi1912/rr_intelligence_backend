import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthRequest, PropertyData } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { sanitizeInput, validatePropertyImages } from '../utils/validation';

export const getAllProperties = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { 
    search, 
    propertyType, 
    minPrice, 
    maxPrice, 
    minArea, 
    maxArea, 
    bedrooms, 
    bathrooms, 
    location,
    page = '1', 
    limit = '10' 
  } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    isActive: true
  };

  // Search in description or location
  if (search) {
    const searchTerm = sanitizeInput(search as string);
    where.OR = [
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { propertyType: { contains: searchTerm, mode: 'insensitive' } }
    ];
  }

  // Filter by property type
  if (propertyType) {
    where.propertyType = { contains: sanitizeInput(propertyType as string), mode: 'insensitive' };
  }

  // Filter by location
  if (location) {
    where.location = { contains: sanitizeInput(location as string), mode: 'insensitive' };
  }

  // Filter by price range
  if (minPrice || maxPrice) {
    where.pricePerSqft = {};
    if (minPrice) {
      where.pricePerSqft.gte = parseFloat(minPrice as string);
    }
    if (maxPrice) {
      where.pricePerSqft.lte = parseFloat(maxPrice as string);
    }
  }

  // Filter by area range
  if (minArea || maxArea) {
    where.area = {};
    if (minArea) {
      where.area.gte = parseFloat(minArea as string);
    }
    if (maxArea) {
      where.area.lte = parseFloat(maxArea as string);
    }
  }

  // Filter by bedrooms
  if (bedrooms) {
    where.bedrooms = parseInt(bedrooms as string, 10);
  }

  // Filter by bathrooms
  if (bathrooms) {
    where.bathrooms = parseInt(bathrooms as string, 10);
  }

  const [properties, totalCount] = await Promise.all([
    prisma.property.findMany({
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
    prisma.property.count({ where })
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

export const getPropertyById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const property = await prisma.property.findFirst({
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

  // Increment view count and update last viewed
  await prisma.property.update({
    where: { id },
    data: { 
      viewCount: (property.viewCount || 0) + 1,
      lastViewed: new Date()
    }
  });

  res.json({ property });
});

export const createProperty = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const {
    images,
    videos,
    description,
    pricePerSqft,
    totalPrice,
    location,
    contactInfo,
    propertyType,
    area,
    bedrooms,
    bathrooms,
    features,
    status,
    mainImageIndex,
    amenities,
    floorPlan,
    virtualTour,
    isFeatured
  }: PropertyData = req.body;

  // Validation
  if (!images || !description || !pricePerSqft || !location || !contactInfo) {
    res.status(400).json({ 
      error: 'Images, description, price per sqft, location, and contact info are required' 
    });
    return;
  }

  // Validate images (now expecting PropertyImage[] format)
  if (!Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: 'At least one image is required' });
    return;
  }

  if (images.length > 20) {
    res.status(400).json({ error: 'Maximum 20 images allowed' });
    return;
  }

  // Validate videos if provided
  if (videos && videos.length > 5) {
    res.status(400).json({ error: 'Maximum 5 videos allowed' });
    return;
  }

  // Validate price
  if (pricePerSqft <= 0) {
    res.status(400).json({ error: 'Price per sqft must be greater than 0' });
    return;
  }

  // Validate total price if provided
  if (totalPrice !== undefined && totalPrice <= 0) {
    res.status(400).json({ error: 'Total price must be greater than 0' });
    return;
  }

  // Validate area if provided
  if (area !== undefined && area <= 0) {
    res.status(400).json({ error: 'Area must be greater than 0' });
    return;
  }

  // Validate bedrooms and bathrooms if provided
  if (bedrooms !== undefined && (bedrooms < 0 || !Number.isInteger(bedrooms))) {
    res.status(400).json({ error: 'Bedrooms must be a non-negative integer' });
    return;
  }

  if (bathrooms !== undefined && (bathrooms < 0 || !Number.isInteger(bathrooms))) {
    res.status(400).json({ error: 'Bathrooms must be a non-negative integer' });
    return;
  }

  // Validate main image index
  if (mainImageIndex !== undefined && (mainImageIndex < 0 || mainImageIndex >= images.length)) {
    res.status(400).json({ error: 'Invalid main image index' });
    return;
  }

  const property = await prisma.property.create({
    data: {
      userId,
      images: images as any,
      ...(videos && { videos: videos as any }),
      description: sanitizeInput(description),
      pricePerSqft,
      ...(totalPrice !== undefined && { totalPrice }),
      location: sanitizeInput(location),
      contactInfo: sanitizeInput(contactInfo),
      ...(propertyType && { propertyType: sanitizeInput(propertyType) }),
      ...(area !== undefined && { area }),
      ...(bedrooms !== undefined && { bedrooms }),
      ...(bathrooms !== undefined && { bathrooms }),
      ...(features && { features: features as any }),
      ...(status && { status }),
      ...(mainImageIndex !== undefined && { mainImageIndex }),
      ...(amenities && { amenities: amenities as any }),
      ...(floorPlan && { floorPlan }),
      ...(virtualTour && { virtualTour }),
      ...(isFeatured !== undefined && { isFeatured })
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

export const updateProperty = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const {
    images,
    videos,
    description,
    pricePerSqft,
    totalPrice,
    location,
    contactInfo,
    propertyType,
    area,
    bedrooms,
    bathrooms,
    features,
    status,
    mainImageIndex,
    amenities,
    floorPlan,
    virtualTour,
    isFeatured
  } = req.body;

  // Check if property exists and belongs to user
  const existingProperty = await prisma.property.findFirst({
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

  // Validate images if provided
  if (images) {
    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: 'At least one image is required' });
      return;
    }

    if (images.length > 20) {
      res.status(400).json({ error: 'Maximum 20 images allowed' });
      return;
    }
  }

  // Validate videos if provided
  if (videos && videos.length > 5) {
    res.status(400).json({ error: 'Maximum 5 videos allowed' });
    return;
  }

  // Validate price if provided
  if (pricePerSqft !== undefined && pricePerSqft <= 0) {
    res.status(400).json({ error: 'Price per sqft must be greater than 0' });
    return;
  }

  // Validate total price if provided
  if (totalPrice !== undefined && totalPrice <= 0) {
    res.status(400).json({ error: 'Total price must be greater than 0' });
    return;
  }

  // Validate area if provided
  if (area !== undefined && area <= 0) {
    res.status(400).json({ error: 'Area must be greater than 0' });
    return;
  }

  // Validate bedrooms and bathrooms if provided
  if (bedrooms !== undefined && (bedrooms < 0 || !Number.isInteger(bedrooms))) {
    res.status(400).json({ error: 'Bedrooms must be a non-negative integer' });
    return;
  }

  if (bathrooms !== undefined && (bathrooms < 0 || !Number.isInteger(bathrooms))) {
    res.status(400).json({ error: 'Bathrooms must be a non-negative integer' });
    return;
  }

  // Validate main image index if provided
  if (mainImageIndex !== undefined && images && (mainImageIndex < 0 || mainImageIndex >= images.length)) {
    res.status(400).json({ error: 'Invalid main image index' });
    return;
  }

  const updatedProperty = await prisma.property.update({
    where: { id },
    data: {
      ...(images && { images: images as any }),
      ...(videos !== undefined && { videos: videos as any }),
      ...(description && { description: sanitizeInput(description) }),
      ...(pricePerSqft !== undefined && { pricePerSqft }),
      ...(totalPrice !== undefined && { totalPrice }),
      ...(location && { location: sanitizeInput(location) }),
      ...(contactInfo && { contactInfo: sanitizeInput(contactInfo) }),
      ...(propertyType && { propertyType: sanitizeInput(propertyType) }),
      ...(area !== undefined && { area }),
      ...(bedrooms !== undefined && { bedrooms }),
      ...(bathrooms !== undefined && { bathrooms }),
      ...(features !== undefined && { features: features as any }),
      ...(status && { status }),
      ...(mainImageIndex !== undefined && { mainImageIndex }),
      ...(amenities !== undefined && { amenities: amenities as any }),
      ...(floorPlan !== undefined && { floorPlan }),
      ...(virtualTour !== undefined && { virtualTour }),
      ...(isFeatured !== undefined && { isFeatured })
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

export const deleteProperty = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Check if property exists and belongs to user
  const existingProperty = await prisma.property.findFirst({
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

  // Soft delete by setting isActive to false
  await prisma.property.update({
    where: { id },
    data: { isActive: false }
  });

  res.json({ message: 'Property deleted successfully' });
});

export const getUserProperties = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [properties, totalCount] = await Promise.all([
    prisma.property.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    }),
    prisma.property.count({
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
