import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export interface SignUpData {
  username: string;
  companyName: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface PropertyImage {
  id: string;
  url: string; // Base64 string
  isMain: boolean;
  order: number;
  caption?: string;
}

export interface PropertyVideo {
  id: string;
  url: string; // Base64 string
  order: number;
  caption?: string;
  thumbnail?: string;
}

export interface PropertyData {
  images: PropertyImage[]; // Array of image objects
  videos?: PropertyVideo[]; // Array of video objects
  description: string;
  pricePerSqft: number;
  totalPrice?: number;
  location: string;
  contactInfo: string;
  propertyType?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  features?: string[]; // Array of feature strings
  status?: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'UNDER_MAINTENANCE';
  mainImageIndex?: number;
  amenities?: string[]; // Array of amenity strings
  floorPlan?: string; // Base64 string for floor plan
  virtualTour?: string; // URL for virtual tour
  isFeatured?: boolean;
}

export interface LeadData {
  telegramUserId: string;
  name?: string;
  phoneNumber?: string;
  budget?: number;
  expectations?: string;
  language?: string;
}

export interface ChatMessage {
  telegramUserId: string;
  message: string;
  response?: string;
  messageType?: string;
  language?: string;
}

export interface StatsQuery {
  startDate?: string;
  endDate?: string;
  leadStatus?: 'NOT_QUALIFIED' | 'MEDIUM' | 'HIGH';
}

// Re-export Prisma enums for consistency
export { LeadStatus, FollowUpStatus, PropertyStatus } from '@prisma/client';
