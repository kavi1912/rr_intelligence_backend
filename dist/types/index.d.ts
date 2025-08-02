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
export interface PropertyData {
    images: string[];
    description: string;
    pricePerSqft: number;
    location: string;
    contactInfo: string;
    propertyType?: string;
    area?: number;
    bedrooms?: number;
    bathrooms?: number;
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
export { LeadStatus, FollowUpStatus } from '@prisma/client';
//# sourceMappingURL=index.d.ts.map