# RRintelligence CRM API Documentation

## Base URL
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

## Authentication
Most endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Global Features
- Rate limiting: 100 requests per 15 minutes per IP
- Request size limit: 50MB (for image uploads)
- CORS enabled for localhost:3000 and localhost:5173

---

## 1. AUTHENTICATION ENDPOINTS (`/api/auth`)

### 1.1 Sign Up
**POST** `/api/auth/signup`

**Request Body:**
```json
{
  "username": "string (required)",
  "companyName": "string (required)",
  "phoneNumber": "string (required, format: +1234567890)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars with special chars)"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_string",
  "user": {
    "id": "string",
    "username": "string",
    "companyName": "string",
    "phoneNumber": "string",
    "email": "string",
    "createdAt": "ISO_date"
  }
}
```

**Error Responses:**
- 400: Validation errors (missing fields, invalid format)
- 409: Email/phone/username already exists

### 1.2 Sign In
**POST** `/api/auth/signin`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt_token_string",
  "user": {
    "id": "string",
    "username": "string",
    "companyName": "string",
    "phoneNumber": "string",
    "email": "string",
    "createdAt": "ISO_date"
  }
}
```

**Error Responses:**
- 400: Missing email or password
- 401: Invalid credentials

### 1.3 Get Profile
**GET** `/api/auth/profile`
**Authentication:** Required

**Response (200):**
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "companyName": "string",
    "phoneNumber": "string",
    "email": "string",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date"
  }
}
```

### 1.4 Update Profile
**PUT** `/api/auth/profile`
**Authentication:** Required

**Request Body:**
```json
{
  "username": "string (optional)",
  "companyName": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "string",
    "username": "string",
    "companyName": "string",
    "phoneNumber": "string",
    "email": "string",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date"
  }
}
```

---

## 2. LEADS ENDPOINTS (`/api/leads`)

### 2.1 Get All Leads
**GET** `/api/leads`
**Authentication:** Required

**Query Parameters:**
- `status`: string (NOT_QUALIFIED, MEDIUM, HIGH)
- `startDate`: ISO date string
- `endDate`: ISO date string  
- `search`: string (searches name, phone, telegramUserId)
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response (200):**
```json
{
  "leads": [
    {
      "id": "string",
      "telegramUserId": "string",
      "name": "string",
      "phoneNumber": "string",
      "budget": "number",
      "expectations": "string",
      "status": "NOT_QUALIFIED|MEDIUM|HIGH",
      "language": "string",
      "createdAt": "ISO_date",
      "updatedAt": "ISO_date",
      "chatHistory": [
        {
          "id": "string",
          "message": "string",
          "response": "string",
          "messageType": "string",
          "timestamp": "ISO_date"
        }
      ],
      "followUps": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 2.2 Get Lead by ID
**GET** `/api/leads/:id`
**Authentication:** Required

**Response (200):**
```json
{
  "lead": {
    "id": "string",
    "telegramUserId": "string",
    "name": "string",
    "phoneNumber": "string",
    "budget": "number",
    "expectations": "string",
    "status": "string",
    "language": "string",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date",
    "chatHistory": [],
    "followUps": []
  }
}
```

### 2.3 Create Lead
**POST** `/api/leads`
**Authentication:** Not Required (For Telegram bot)

**Request Body:**
```json
{
  "telegramUserId": "string (required)",
  "name": "string (optional)",
  "phoneNumber": "string (optional)",
  "budget": "number (optional)",
  "expectations": "string (optional)",
  "language": "string (default: 'en')"
}
```

**Response (201):**
```json
{
  "message": "Lead created successfully",
  "lead": {
    "id": "string",
    "telegramUserId": "string",
    "name": "string",
    "phoneNumber": "string",
    "budget": "number",
    "expectations": "string",
    "status": "NOT_QUALIFIED",
    "language": "string",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date"
  }
}
```

### 2.4 Update Lead Status
**PATCH** `/api/leads/:id/status`
**Authentication:** Required

**Request Body:**
```json
{
  "status": "NOT_QUALIFIED|MEDIUM|HIGH"
}
```

**Response (200):**
```json
{
  "message": "Lead status updated successfully",
  "lead": {
    "id": "string",
    "status": "HIGH",
    ...
  }
}
```

### 2.5 Update Lead
**PUT** `/api/leads/:id`
**Authentication:** Required

**Request Body:**
```json
{
  "name": "string (optional)",
  "phoneNumber": "string (optional)",
  "budget": "number (optional)",
  "expectations": "string (optional)",
  "status": "string (optional)",
  "language": "string (optional)"
}
```

### 2.6 Delete Lead
**DELETE** `/api/leads/:id`
**Authentication:** Required

**Response (200):**
```json
{
  "message": "Lead deleted successfully"
}
```

### 2.7 Get Lead by Telegram User ID
**GET** `/api/leads/telegram/:telegramUserId`
**Authentication:** Not Required (For Telegram bot)

**Response (200):**
```json
{
  "lead": {
    "id": "string",
    "telegramUserId": "string",
    "name": "string",
    "phoneNumber": "string",
    "budget": "number",
    "expectations": "string",
    "status": "string",
    "language": "string",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date",
    "chatHistory": [
      {
        "id": "string",
        "message": "string",
        "response": "string",
        "messageType": "string",
        "timestamp": "ISO_date"
      }
    ]
  }
}
```

---

## 3. PROPERTIES ENDPOINTS (`/api/properties`)

### 3.1 Get All Properties
**GET** `/api/properties`
**Authentication:** Not Required

**Query Parameters:**
- `search`: string
- `propertyType`: string
- `minPrice`: number (price per sqft)
- `maxPrice`: number (price per sqft)
- `minArea`: number
- `maxArea`: number
- `bedrooms`: number
- `bathrooms`: number
- `location`: string
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response (200):**
```json
{
  "properties": [
    {
      "id": "string",
      "userId": "string",
      "images": ["base64_string"],
      "description": "string",
      "pricePerSqft": "number",
      "location": "string",
      "contactInfo": "string",
      "propertyType": "string",
      "area": "number",
      "bedrooms": "number",
      "bathrooms": "number",
      "isActive": "boolean",
      "createdAt": "ISO_date",
      "updatedAt": "ISO_date",
      "user": {
        "id": "string",
        "username": "string",
        "companyName": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

### 3.2 Get Property by ID
**GET** `/api/properties/:id`
**Authentication:** Not Required

**Response (200):**
```json
{
  "property": {
    "id": "string",
    "userId": "string",
    "images": ["base64_string"],
    "description": "string",
    "pricePerSqft": "number",
    "location": "string",
    "contactInfo": "string",
    "propertyType": "string",
    "area": "number",
    "bedrooms": "number",
    "bathrooms": "number",
    "isActive": "boolean",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date",
    "user": {
      "id": "string",
      "username": "string",
      "companyName": "string",
      "phoneNumber": "string",
      "email": "string"
    }
  }
}
```

### 3.3 Create Property
**POST** `/api/properties`
**Authentication:** Required

**Request Body:**
```json
{
  "images": ["base64_string (required)"],
  "description": "string (required)",
  "pricePerSqft": "number (required, > 0)",
  "location": "string (required)",
  "contactInfo": "string (required)",
  "propertyType": "string (optional)",
  "area": "number (optional, > 0)",
  "bedrooms": "number (optional, >= 0)",
  "bathrooms": "number (optional, >= 0)"
}
```

**Response (201):**
```json
{
  "message": "Property created successfully",
  "property": {
    "id": "string",
    "userId": "string",
    "images": ["base64_string"],
    "description": "string",
    "pricePerSqft": "number",
    "location": "string",
    "contactInfo": "string",
    "propertyType": "string",
    "area": "number",
    "bedrooms": "number",
    "bathrooms": "number",
    "isActive": true,
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date",
    "user": {
      "id": "string",
      "username": "string",
      "companyName": "string"
    }
  }
}
```

### 3.4 Update Property
**PUT** `/api/properties/:id`
**Authentication:** Required (Owner only)

**Request Body:** Same as Create Property (all fields optional)

### 3.5 Delete Property
**DELETE** `/api/properties/:id`
**Authentication:** Required (Owner only)

**Response (200):**
```json
{
  "message": "Property deleted successfully"
}
```

### 3.6 Get User's Properties
**GET** `/api/properties/user/my-properties`
**Authentication:** Required

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 10)

**Response (200):**
```json
{
  "properties": [
    {
      "id": "string",
      "userId": "string",
      "images": ["base64_string"],
      "description": "string",
      "pricePerSqft": "number",
      "location": "string",
      "contactInfo": "string",
      "propertyType": "string",
      "area": "number",
      "bedrooms": "number",
      "bathrooms": "number",
      "isActive": "boolean",
      "createdAt": "ISO_date",
      "updatedAt": "ISO_date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

---

## 4. CHAT ENDPOINTS (`/api/chat`)

### 4.1 Get Chat History by Telegram User ID
**GET** `/api/chat/history/:telegramUserId`
**Authentication:** Not Required (For Telegram bot)

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50)

**Response (200):**
```json
{
  "telegramUserId": "string",
  "lead": {
    "id": "string",
    "name": "string",
    "phoneNumber": "string",
    "status": "string",
    "language": "string",
    "createdAt": "ISO_date"
  },
  "chatHistory": [
    {
      "id": "string",
      "telegramUserId": "string",
      "leadId": "string",
      "message": "string",
      "response": "string",
      "messageType": "string",
      "language": "string",
      "timestamp": "ISO_date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

### 4.2 Save Chat Message
**POST** `/api/chat/message`
**Authentication:** Not Required (For Telegram bot)

**Request Body:**
```json
{
  "telegramUserId": "string (required)",
  "message": "string (required)",
  "response": "string (optional)",
  "messageType": "string (default: 'text')",
  "language": "string (default: 'en')"
}
```

**Response (201):**
```json
{
  "message": "Chat message saved successfully",
  "chatMessage": {
    "id": "string",
    "telegramUserId": "string",
    "leadId": "string",
    "message": "string",
    "response": "string",
    "messageType": "string",
    "language": "string",
    "timestamp": "ISO_date"
  }
}
```

### 4.3 Get Chat Summary
**GET** `/api/chat/summary/:telegramUserId`
**Authentication:** Not Required (For Telegram bot)

**Response (200):**
```json
{
  "telegramUserId": "string",
  "lead": {
    "id": "string",
    "name": "string",
    "phoneNumber": "string",
    "budget": "number",
    "expectations": "string",
    "status": "string",
    "language": "string",
    "createdAt": "ISO_date",
    "updatedAt": "ISO_date"
  },
  "chatSummary": {
    "totalMessages": 45,
    "firstMessageAt": "ISO_date",
    "lastMessageAt": "ISO_date",
    "conversationDurationMs": 1234567,
    "firstMessage": "string",
    "lastMessage": "string",
    "lastResponse": "string"
  }
}
```

### 4.4 Get Active Chat Sessions
**GET** `/api/chat/active-sessions`
**Authentication:** Required

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `hours`: number (default: 24) - Time frame for active sessions

**Response (200):**
```json
{
  "activeSessions": [
    {
      "telegramUserId": "string",
      "lead": {
        "id": "string",
        "name": "string",
        "phoneNumber": "string",
        "status": "string",
        "language": "string",
        "createdAt": "ISO_date"
      },
      "lastActivity": "ISO_date",
      "lastMessage": {
        "message": "string",
        "response": "string",
        "messageType": "string",
        "timestamp": "ISO_date"
      },
      "messageCount": 15,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  },
  "timeFrame": {
    "hours": 24,
    "cutoffTime": "ISO_date"
  }
}
```

### 4.5 Search Chat History
**GET** `/api/chat/search`
**Authentication:** Required

**Query Parameters:**
- `query`: string (required) - Search term
- `telegramUserId`: string (optional) - Filter by user
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)
- `messageType`: string (optional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response (200):**
```json
{
  "searchQuery": "string",
  "results": [
    {
      "id": "string",
      "telegramUserId": "string",
      "leadId": "string",
      "message": "string",
      "response": "string",
      "messageType": "string",
      "language": "string",
      "timestamp": "ISO_date",
      "lead": {
        "id": "string",
        "name": "string",
        "status": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

### 4.6 Delete Chat History
**DELETE** `/api/chat/history/:telegramUserId`
**Authentication:** Required

**Response (200):**
```json
{
  "message": "Chat history deleted successfully",
  "deletedCount": 45
}
```

---

## 5. STATISTICS ENDPOINTS (`/api/stats`)

**Note:** All stats endpoints require authentication.

### 5.1 Get Daily Stats
**GET** `/api/stats/daily`
**Authentication:** Required

**Query Parameters:**
- `startDate`: ISO date string (optional, default: today)
- `endDate`: ISO date string (optional, default: tomorrow)
- `leadStatus`: string (optional) - Filter by status

**Response (200):**
```json
{
  "date": "2023-12-25",
  "totalLeads": 15,
  "newLeads": 15,
  "chatMessages": 120,
  "leadsByStatus": {
    "NOT_QUALIFIED": 5,
    "MEDIUM": 7,
    "HIGH": 3
  }
}
```

### 5.2 Get Weekly Stats
**GET** `/api/stats/weekly`
**Authentication:** Required

**Query Parameters:**
- `leadStatus`: string (optional) - Filter by status

**Response (200):**
```json
{
  "period": "week",
  "startDate": "2023-12-19",
  "endDate": "2023-12-25",
  "totalLeads": 85,
  "totalNewLeads": 85,
  "totalChatMessages": 650,
  "leadsByStatus": {
    "NOT_QUALIFIED": 25,
    "MEDIUM": 35,
    "HIGH": 25
  },
  "dailyBreakdown": [
    {
      "date": "2023-12-19",
      "leads": 12,
      "newLeads": 12,
      "chatMessages": 95
    }
  ]
}
```

### 5.3 Get Monthly Stats
**GET** `/api/stats/monthly`
**Authentication:** Required

**Query Parameters:**
- `leadStatus`: string (optional) - Filter by status

**Response (200):**
```json
{
  "period": "month",
  "month": "2023-12",
  "totalLeads": 350,
  "totalNewLeads": 350,
  "totalChatMessages": 2800,
  "leadsByStatus": {
    "NOT_QUALIFIED": 120,
    "MEDIUM": 150,
    "HIGH": 80
  },
  "dailyBreakdown": [
    {
      "date": "2023-12-01",
      "leads": 15
    }
  ]
}
```

### 5.4 Get Dashboard Stats
**GET** `/api/stats/dashboard`
**Authentication:** Required

**Response (200):**
```json
{
  "today": {
    "leads": 15,
    "newLeads": 15,
    "chatMessages": 120,
    "leadsByStatus": {
      "NOT_QUALIFIED": 5,
      "MEDIUM": 7,
      "HIGH": 3
    }
  },
  "thisWeek": {
    "leads": 85,
    "newLeads": 85,
    "chatMessages": 650
  },
  "thisMonth": {
    "leads": 350,
    "newLeads": 350,
    "chatMessages": 2800
  },
  "overall": {
    "totalLeads": 1500,
    "totalProperties": 45,
    "totalUsers": 12,
    "totalChatMessages": 15000,
    "leadsByStatus": {
      "NOT_QUALIFIED": 600,
      "MEDIUM": 650,
      "HIGH": 250
    }
  },
  "recentActivity": {
    "leads": [
      {
        "id": "string",
        "telegramUserId": "string",
        "name": "string",
        "status": "string",
        "createdAt": "ISO_date"
      }
    ],
    "chats": [
      {
        "id": "string",
        "telegramUserId": "string",
        "message": "string",
        "messageType": "string",
        "timestamp": "ISO_date"
      }
    ]
  }
}
```

### 5.5 Get Custom Stats
**GET** `/api/stats/custom`
**Authentication:** Required

**Query Parameters:**
- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)
- `leadStatus`: string (optional) - Filter by status

**Response (200):**
```json
{
  "period": "custom",
  "startDate": "2023-12-01",
  "endDate": "2023-12-25",
  "totalLeads": 200,
  "totalChats": 1500,
  "leadsByStatus": {
    "NOT_QUALIFIED": 80,
    "MEDIUM": 80,
    "HIGH": 40
  },
  "dailyBreakdown": [
    {
      "date": "2023-12-01",
      "leads": 8
    }
  ]
}
```

---

## 6. MOCK ENDPOINTS (`/api/mock`)

**Note:** These endpoints work without database connection for testing.

### 6.1 Mock Sign Up
**POST** `/api/mock/signup`
Same request/response as `/api/auth/signup`

### 6.2 Mock Sign In
**POST** `/api/mock/signin`

**Pre-configured users:**
- Email: `admin@rrcrm.com`, Password: `admin123`
- Email: `demo@rrcrm.com`, Password: `user123`

Same request/response as `/api/auth/signin`

### 6.3 Mock Get Profile
**GET** `/api/mock/profile`
**Authentication:** Required
Same response as `/api/auth/profile`

### 6.4 Mock Get Properties
**GET** `/api/mock/properties`

**Response (200):**
```json
{
  "properties": [
    {
      "id": "1",
      "userId": "1",
      "images": ["data:image/jpeg;base64,/9j/sample1"],
      "description": "Beautiful 3-bedroom apartment in downtown with modern amenities",
      "pricePerSqft": 250.00,
      "location": "Downtown Mumbai",
      "contactInfo": "admin@rrcrm.com | +1234567890",
      "propertyType": "Apartment",
      "area": 1200.00,
      "bedrooms": 3,
      "bathrooms": 2,
      "isActive": true,
      "createdAt": "ISO_date",
      "updatedAt": "ISO_date"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### 6.5 Mock Get Leads
**GET** `/api/mock/leads`

**Response (200):**
```json
{
  "leads": [
    {
      "id": "1",
      "telegramUserId": "123456789",
      "name": "Rajesh Kumar",
      "phoneNumber": "+919876543210",
      "budget": 5000000.00,
      "expectations": "Looking for a 3BHK apartment in Mumbai",
      "status": "HIGH",
      "language": "en",
      "createdAt": "ISO_date",
      "updatedAt": "ISO_date"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1
}
```

### 6.6 Mock Get Stats
**GET** `/api/mock/stats/overview`

**Response (200):**
```json
{
  "totalLeads": 1,
  "totalProperties": 1,
  "totalUsers": 2,
  "leadsToday": 1,
  "leadsThisWeek": 2,
  "leadsThisMonth": 4,
  "leadsByStatus": {
    "NOT_QUALIFIED": 1,
    "MEDIUM": 1,
    "HIGH": 2
  }
}
```

---

## 7. GENERAL ENDPOINTS

### 7.1 Health Check
**GET** `/health`

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "ISO_date"
}
```

### 7.2 API Info
**GET** `/api`

**Response (200):**
```json
{
  "message": "RRintelligence CRM API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth (POST /signup, POST /signin, GET /profile)",
    "leads": "/api/leads (GET, POST, PUT, DELETE)",
    "properties": "/api/properties (GET, POST, PUT, DELETE)",
    "stats": "/api/stats (GET /daily, /weekly, /monthly)",
    "chat": "/api/chat (GET /history/:userId, POST /message)"
  },
  "health": "/health"
}
```

---

## ERROR HANDLING

### Common Error Response Format:
```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes:
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate data)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

---

## DATA TYPES

### Lead Status Enum:
- `NOT_QUALIFIED`
- `MEDIUM`
- `HIGH`

### Message Types:
- `text`
- `image`
- `audio`
- `video`
- `document`

### Validation Rules:
- **Email**: Must be valid email format
- **Phone Number**: Must include country code (e.g., +1234567890)
- **Password**: Minimum 8 characters with special characters
- **Images**: Base64 encoded strings
- **Price/Budget**: Must be positive numbers
- **Area**: Must be positive number
- **Bedrooms/Bathrooms**: Must be non-negative integers

---

## RATE LIMITING
- **Limit**: 100 requests per 15 minutes per IP address
- **Response**: 429 status with message "Too many requests from this IP, please try again later."

---

## CORS POLICY
- **Development**: Allows `http://localhost:3000` and `http://localhost:5173`
- **Production**: Allows `https://yourdomain.com`
- **Credentials**: Enabled

---

This documentation covers all available endpoints, request/response formats, authentication requirements, and error handling for the RRintelligence CRM API.
