import { PrismaClient, LeadStatus } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ConversationContext {
  name?: string;
  requirements: {
    propertyType?: string;
    bedrooms?: number;
    location?: string;
    budget?: string;
    phoneNumber?: string;
  };
  chatHistory: Array<{
    message: string;
    response: string;
    timestamp: Date;
  }>;
  stage: 'greeting' | 'collecting_name' | 'collecting_requirements' | 'collecting_phone' | 'showing_properties' | 'completed';
}

export interface LeadSubClass {
  category: 'investor' | 'end_user' | 'nri' | 'commercial' | 'land_buyer';
  urgency: 'immediate' | 'within_month' | 'within_3months' | 'future';
  budget_verified: boolean;
  source_quality: 'organic' | 'referral' | 'advertisement';
}

export class AIConversationService {
  private model: any;
  private propertyCache: any[] = [];
  private lastPropertyUpdate: Date = new Date(0);

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      }
    });
  }

  // Method to force refresh property cache (call when properties are updated)
  public refreshPropertyCache(): void {
    this.propertyCache = [];
    this.lastPropertyUpdate = new Date(0);
  }

  // Load fresh property data for AI prompt
  private async getPropertyDataForAI(): Promise<string> {
    try {
      // Check if we need to refresh cache (every 1 minute for immediate updates)
      const now = new Date();
      const shouldRefresh = this.propertyCache.length === 0 || 
        (now.getTime() - this.lastPropertyUpdate.getTime()) > 1 * 60 * 1000;

      if (shouldRefresh) {
        const properties = await prisma.property.findMany({
          where: { isActive: true },
          select: {
            id: true,
            description: true,
            location: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
            pricePerSqft: true,
            totalPrice: true,
            propertyType: true,
            amenities: true,
            contactInfo: true,
            features: true,
            status: true,
            images: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        });

        this.propertyCache = properties;
        this.lastPropertyUpdate = now;
      }

      if (this.propertyCache.length === 0) {
        return "AVAILABLE_PROPERTIES: No properties currently available in database.";
      }

      const propertyJson = JSON.stringify(this.propertyCache, null, 2);
      return `AVAILABLE_PROPERTIES: ${propertyJson}`;
    } catch (error) {
      console.error('Error loading property data:', error);
      return "AVAILABLE_PROPERTIES: Error loading property data.";
    }
  }
  
  async processMessage(telegramUserId: string, message: string): Promise<string> {
    try {
      // Handle /start command specifically
      if (message === '/start') {
        return await this.handleStartCommand(telegramUserId);
      }

      // Get conversation context from chat history
      const context = await this.getConversationContext(telegramUserId);
      
      // Generate AI response using Gemini
      const response = await this.generateAIResponse(message, telegramUserId, context);
      
      // Update conversation context and create leads
      await this.updateConversationAndLeads(telegramUserId, message, response);
      
      return response;
      
    } catch (error) {
      console.error('Error processing message:', error);
      return "I apologize, but I'm having trouble processing your message right now. Please try again.";
    }
  }

  private async handleStartCommand(telegramUserId: string): Promise<string> {
    try {
      // Check if user already exists in leads
      const existingLead = await prisma.lead.findFirst({
        where: { telegramUserId }
      });

      const welcomeMessage = `🏠 Welcome to RRintelligence!

I'm ReaLYAI, your friendly real estate assistant. I'm here to help you find the perfect property!

What's your name?`;

      // Log the start conversation
      await this.logChatHistory(telegramUserId, '/start', welcomeMessage);

      return welcomeMessage;
    } catch (error) {
      console.error('Error handling start command:', error);
      return `🏠 Welcome to RRintelligence! I'm ReaLYAI, your real estate assistant. What's your name?`;
    }
  }
  
  private async getConversationContext(telegramUserId: string): Promise<ConversationContext> {
    // Get recent chat history to understand context
    const recentHistory = await prisma.chatHistory.findMany({
      where: { telegramUserId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    // Get existing lead to extract collected data
    const existingLead = await prisma.lead.findFirst({
      where: { telegramUserId }
    });

    // Build context from existing data
    const context: ConversationContext = {
      name: existingLead?.name || undefined,
      requirements: {
        phoneNumber: existingLead?.phoneNumber || undefined,
        budget: existingLead?.budget ? existingLead.budget.toString() : undefined,
      },
      chatHistory: recentHistory.map(h => ({
        message: h.message,
        response: h.response || '',
        timestamp: h.timestamp
      })),
      stage: this.determineConversationStage(existingLead, recentHistory)
    };

    return context;
  }

  private determineConversationStage(lead: any, history: any[]): ConversationContext['stage'] {
    // Simple, clear priority: Name first, then phone, then help with properties
    if (!lead?.name) return 'collecting_name';
    if (!lead?.phoneNumber) return 'collecting_phone';
    return 'showing_properties'; // Once we have name+phone, help them with properties
  }

  private async generateAIResponse(message: string, telegramUserId: string, context: ConversationContext): Promise<string> {
    try {
      // Handle /start command
      if (message === '/start') {
        return `👋 Hello! I'm ReaLYAI, your personal real estate assistant.

I'm here to help you find the perfect property! What's your name?`;
      }

      // Check if user is asking for property images
      if (this.isImageRequest(message)) {
        return await this.handleImageRequest(message, context);
      }

      // Check if user is asking for property listings
      if (this.isPropertyListingRequest(message)) {
        return await this.handlePropertyListingRequest(message, context);
      }

      // Check if user is asking market questions
      if (this.isMarketQuestion(message)) {
        return await this.handleMarketQuestion(message, context);
      }

      // Get live property data for AI prompt
      const propertyData = await this.getPropertyDataForAI();
      
      // Build comprehensive context for Gemini with better memory
      const conversationHistory = context.chatHistory
        .slice(-8) // Last 8 messages for better context
        .map(h => `User: ${h.message}\nBot: ${h.response}`)
        .join('\n');

      // Extract known information from conversation
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);

      const systemPrompt = `You are ReaLYAI, a friendly real estate assistant.

KNOWN USER INFO:
Name: ${knownInfo.name || 'Not provided'}
Phone: ${knownInfo.phone || 'Not provided'} 
Location: ${knownInfo.location || 'Not provided'}
Budget: ${knownInfo.budget || 'Not provided'}
Property Type: ${knownInfo.propertyType || 'Not provided'}

${propertyData}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT MESSAGE: "${message}"

RULES:
- Be natural and friendly
- If no name: Ask "What's your name?"
- If name but no phone: Ask "Can I get your phone number?"
- If they want properties: Show them from the data above
- If they want images: Tell them you're sending images
- If you don't know something: Just say "I don't know"
- Don't give technical explanations
- Be direct and helpful

Help them find properties!`;

      const result = await this.model.generateContent(systemPrompt);
      const response = result.response;
      return response.text() || "I apologize, but I'm having trouble responding right now. Please try again.";
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Fallback response based on what we know
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
      if (!knownInfo.name) {
        return "Hi! I'm ReaLYAI. What's your name?";
      } else if (!knownInfo.phone) {
        return `Hi ${knownInfo.name}! Can I get your phone number to help you better?`;
      } else {
        return `${knownInfo.name}, I'm here to help you find properties. What are you looking for?`;
      }
    }
  }

  private extractKnownInfoFromHistory(chatHistory: any[], currentMessage: string): any {
    const allMessages = [...chatHistory.map(h => h.message), currentMessage];
    const allText = allMessages.join(' ').toLowerCase();
    
    // Extract name
    let name = null;
    for (const h of chatHistory) {
      if (h.message.length < 20 && /^[a-zA-Z\s]+$/.test(h.message.trim()) && 
          !h.message.toLowerCase().includes('property') && 
          !h.message.toLowerCase().includes('want') &&
          !h.message.toLowerCase().includes('need') &&
          !h.message.toLowerCase().includes('hi') &&
          !h.message.toLowerCase().includes('hello')) {
        name = h.message.trim();
        break;
      }
    }
    
    // Extract phone
    let phone = null;
    const phoneMatch = allText.match(/(\+91|91)?[\s-]?[6-9]\d{9}/);
    if (phoneMatch) phone = phoneMatch[0];
    
    // Extract location
    let location = null;
    const locations = ['tamil nadu', 'tamilnadu', 'chennai', 'mumbai', 'delhi', 'bangalore', 'pune', 'ahmedabad', 'surat', 'gujarat', 'maharashtra', 'karnataka', 'hyderabad', 'kolkata'];
    for (const loc of locations) {
      if (allText.includes(loc)) {
        location = loc;
        break;
      }
    }
    
    // Extract budget
    let budget = null;
    const budgetMatch = allText.match(/(\d+)\s*(lakh|crore|lakhs|crores)/i);
    if (budgetMatch) budget = budgetMatch[0];
    if (allText.includes('any budget') || allText.includes('budget is fine')) budget = 'Flexible budget';
    
    // Extract property type
    let propertyType = null;
    if (allText.includes('flat') || allText.includes('apartment')) propertyType = 'Apartment/Flat';
    if (allText.includes('house') || allText.includes('villa')) propertyType = 'House/Villa';
    if (allText.includes('bhk')) propertyType = 'BHK';
    
    return { name, phone, location, budget, propertyType };
  }

  private isPropertyListingRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const listingKeywords = [
      'list', 'show', 'available properties', 'all properties', 'properties',
      'what properties do you have', 'show me properties', 'list properties',
      'property details', 'that property', 'the property', 'one property',
      'see the property', 'tell me that one property', 'property we have'
    ];
    return listingKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async handlePropertyListingRequest(message: string, context: ConversationContext): Promise<string> {
    const propertyCount = await prisma.property.count({ where: { isActive: true } });
    
    if (propertyCount === 0) {
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
      return `${knownInfo.name ? knownInfo.name + ', ' : ''}I'm updating our property database right now. I'll save your requirements and our team will contact you within 24 hours with matching properties!`;
    }

    // If properties exist, search and show them
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
    let response = `${knownInfo.name ? knownInfo.name + ', ' : ''}Here are the available properties:\n\n`;
    
    properties.forEach((property, index) => {
      response += `🏠 **Property ${index + 1}**\n`;
      response += `📍 ${property.location}\n`;
      response += `🛏️ ${property.bedrooms || 'N/A'} BHK, ${property.bathrooms || 'N/A'} Bath\n`;
      response += `📐 ${property.area || 'N/A'} sq ft\n`;
      response += `💰 ₹${property.pricePerSqft}/sq ft`;
      if (property.totalPrice) {
        response += ` (Total: ₹${Number(property.totalPrice).toLocaleString()})`;
      }
      response += `\n📝 ${property.description.substring(0, 80)}...\n\n`;
    });
    
    response += `To see images, just say "show images of property 1" or "images"`;
    
    return response;
  }

  private isImageRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const imageKeywords = ['image', 'photo', 'picture', 'show me', 'see'];
    return imageKeywords.some(keyword => lowerMessage.includes(keyword)) && 
           (lowerMessage.includes('property') || lowerMessage.includes('that') || lowerMessage.includes('this'));
  }

  // Method to get property images for Telegram bot
  public async getPropertyImages(propertyIndex: number = 0): Promise<any[]> {
    try {
      const properties = await prisma.property.findMany({
        where: { isActive: true },
        select: { images: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      if (propertyIndex >= properties.length || !properties[propertyIndex]?.images) {
        return [];
      }

      const property = properties[propertyIndex];
      return Array.isArray(property.images) ? property.images : [];
    } catch (error) {
      console.error('Error getting property images:', error);
      return [];
    }
  }

  private async handleImageRequest(message: string, context: ConversationContext): Promise<string> {
    const propertyCount = await prisma.property.count({ where: { isActive: true } });
    
    if (propertyCount === 0) {
      return `No properties available.`;
    }

    // Get the first property (or specific property if mentioned)
    const propertyMatch = message.match(/property\s*(\d+)/i);
    const propertyIndex = propertyMatch ? parseInt(propertyMatch[1]) - 1 : 0;

    const properties = await prisma.property.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    if (propertyIndex >= properties.length) {
      return `I only have ${properties.length} properties. Try "images of property 1".`;
    }

    const property = properties[propertyIndex];
    const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);

    // Build simple response
    let response = `${knownInfo.name ? knownInfo.name + ', p' : 'P'}roperty ${propertyIndex + 1}:\n\n`;
    response += `📍 ${property.location}\n`;
    response += `🏠 ${property.propertyType || 'House'}\n`;
    response += `📐 ${property.area} sq ft\n`;
    response += `💰 ₹${property.pricePerSqft}/sq ft`;
    if (property.totalPrice) {
      response += ` (Total: ₹${Number(property.totalPrice).toLocaleString()})`;
    }

    // Check for images and return special signal for Telegram bot to send them
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
      response += `\n\n📸 Sending ${property.images.length} images...`;
      // Store property index for Telegram bot to know which images to send
      response += `\n[SEND_IMAGES:${propertyIndex}]`;
    } else {
      response += `\n\n📸 No images available.`;
    }

    return response;
  }

  private isMarketQuestion(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const marketKeywords = [
      'price', 'rate', 'cost', 'market', 'current price', 'land price',
      'property price', 'real estate price', 'investment', 'market rate',
      'average price', 'per sqft', 'square foot', 'trends'
    ];
    
    const locationKeywords = [
      'chennai', 'mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad',
      'ahmedabad', 'surat', 'kolkata', 'jaipur', 'tamil nadu', 'gujarat'
    ];
    
    const hasMarketKeyword = marketKeywords.some(kw => lowerMessage.includes(kw));
    const hasLocationKeyword = locationKeywords.some(kw => lowerMessage.includes(kw));
    
    return hasMarketKeyword && hasLocationKeyword;
  }

  private async handleMarketQuestion(message: string, context: ConversationContext): Promise<string> {
    try {
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
      const userName = knownInfo.name || '';
      
      // Use built-in market knowledge
      const marketData = await this.getMarketData(message);
      
      return `${userName ? userName + ', ' : ''}${marketData}`;
      
    } catch (error) {
      console.error('Error getting market data:', error);
      return `${context.name ? context.name + ', ' : ''}I'm sorry, I couldn't fetch the latest market information right now. Let me help you with property listings instead.`;
    }
  }

  private async getMarketData(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();
    
    // Chennai land prices
    if (lowerQuery.includes('chennai') && (lowerQuery.includes('land') || lowerQuery.includes('price'))) {
      return `based on current market data, land prices in Chennai vary significantly by location:

🏙️ **Prime Areas** (T. Nagar, Adyar, Besant Nagar): ₹15,000-25,000 per sq ft
🏘️ **Developing Areas** (Porur, Tambaram, Chromepet): ₹8,000-15,000 per sq ft  
🌆 **Suburban Areas** (Poonamallee, Avadi): ₹4,000-8,000 per sq ft
🌾 **Outskirts** (Kanchipuram, Thiruvallur): ₹2,000-5,000 per sq ft

Prices have increased 8-12% in the last year. Would you like me to help you find specific properties in Chennai?`;
    }
    
    // Mumbai prices
    if (lowerQuery.includes('mumbai') && lowerQuery.includes('price')) {
      return `Mumbai property prices are among the highest in India:

🏙️ **South Mumbai**: ₹40,000-80,000 per sq ft
🏘️ **Central Mumbai**: ₹25,000-50,000 per sq ft
🌆 **Western Suburbs**: ₹15,000-35,000 per sq ft
🌾 **Navi Mumbai**: ₹8,000-20,000 per sq ft

The market has shown steady growth despite high prices. Interested in Mumbai properties?`;
    }
    
    // Bangalore prices
    if (lowerQuery.includes('bangalore') && lowerQuery.includes('price')) {
      return `Bangalore property prices vary by area:

🏙️ **Central Areas** (MG Road, Brigade Road): ₹12,000-25,000 per sq ft
🏘️ **IT Corridors** (Whitefield, Electronic City): ₹8,000-15,000 per sq ft
🌆 **Developing Areas** (Sarjapur, Hennur): ₹5,000-10,000 per sq ft
🌾 **Outskirts**: ₹3,000-6,000 per sq ft

IT growth continues to drive demand. Looking for properties in Bangalore?`;
    }
    
    // General market information
    return `Current real estate market trends show:

📈 **Price Growth**: 6-10% annually in major cities
🏙️ **Hot Markets**: Chennai, Pune, Hyderabad showing strong growth
💰 **Investment Outlook**: Positive due to infrastructure development
🏘️ **Best Value**: Tier-2 cities offering good appreciation potential

Would you like specific information for any particular city or property type?`;
  }

  private async updateConversationAndLeads(telegramUserId: string, message: string, response: string): Promise<void> {
    try {
      // Log chat history
      await this.logChatHistory(telegramUserId, message, response);

      // Extract and update lead information
      await this.extractAndUpdateLead(telegramUserId, message, response);

    } catch (error) {
      console.error('Error updating conversation and leads:', error);
    }
  }

  private async logChatHistory(telegramUserId: string, message: string, response: string): Promise<void> {
    try {
      await prisma.chatHistory.create({
        data: {
          telegramUserId,
          message,
          response,
          messageType: 'text',
          language: 'en'
        }
      });
    } catch (error) {
      console.error('Error logging chat history:', error);
    }
  }

  private async extractAndUpdateLead(telegramUserId: string, userMessage: string, botResponse: string): Promise<void> {
    try {
      // Get conversation history for better analysis
      const chatHistory = await prisma.chatHistory.findMany({
        where: { telegramUserId },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      // Extract information from current message
      const extractedInfo = this.extractLeadInfo(userMessage, botResponse);
      
      // Analyze overall conversation for better lead categorization
      const overallStatus = this.analyzeOverallLeadStatus(chatHistory, userMessage);
      
      // Use the higher status between current message and overall analysis
      const finalStatus = this.getHigherStatus(extractedInfo.status, overallStatus);
      
      // Find or create lead
      let lead = await prisma.lead.findFirst({ where: { telegramUserId } });
      
      if (lead) {
        // Update existing lead with better status logic
        const updateData: any = {};
        if (extractedInfo.name && !lead.name) updateData.name = extractedInfo.name;
        if (extractedInfo.phoneNumber && !lead.phoneNumber) updateData.phoneNumber = extractedInfo.phoneNumber;
        if (extractedInfo.budget && !lead.budget) updateData.budget = extractedInfo.budget;
        if (extractedInfo.expectations) updateData.expectations = extractedInfo.expectations;
        
        // Always update to higher status
        if (finalStatus !== LeadStatus.NOT_QUALIFIED && this.getHigherStatus(lead.status, finalStatus) === finalStatus) {
          updateData.status = finalStatus;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: updateData
          });
        }
      } else if (extractedInfo.name || extractedInfo.phoneNumber || extractedInfo.hasPropertyInterest) {
        // Create new lead
        await prisma.lead.create({
          data: {
            telegramUserId,
            name: extractedInfo.name,
            phoneNumber: extractedInfo.phoneNumber,
            budget: extractedInfo.budget,
            expectations: extractedInfo.expectations,
            status: finalStatus || LeadStatus.NOT_QUALIFIED
          }
        });
      }

    } catch (error) {
      console.error('Error extracting and updating lead:', error);
    }
  }

  private analyzeOverallLeadStatus(chatHistory: any[], currentMessage: string): LeadStatus {
    const allMessages = chatHistory.map(h => h.message).join(' ').toLowerCase() + ' ' + currentMessage.toLowerCase();
    
    // Count high intent signals across entire conversation
    const highIntentSignals = [
      'buy', 'purchase', 'visit', 'meet', 'schedule', 'appointment', 'viewing',
      'ready to buy', 'serious buyer', 'urgent', 'immediately', 'finalize'
    ];
    
    const mediumIntentSignals = [
      'property', 'interested', 'looking for', 'want', 'need', 'budget', 'location'
    ];
    
    const highSignalCount = highIntentSignals.filter(signal => allMessages.includes(signal)).length;
    const mediumSignalCount = mediumIntentSignals.filter(signal => allMessages.includes(signal)).length;
    
    // Has provided phone number in any message
    const hasPhoneInHistory = /(\+91|91)?[\s-]?[6-9]\d{9}/.test(allMessages);
    
    if (highSignalCount >= 2 || (highSignalCount >= 1 && hasPhoneInHistory)) {
      return LeadStatus.HIGH;
    } else if (hasPhoneInHistory || mediumSignalCount >= 3) {
      return LeadStatus.MEDIUM;
    }
    
    return LeadStatus.NOT_QUALIFIED;
  }

  private getHigherStatus(status1: LeadStatus, status2: LeadStatus): LeadStatus {
    const statusPriority = { 
      [LeadStatus.HIGH]: 3, 
      [LeadStatus.MEDIUM]: 2, 
      [LeadStatus.NOT_QUALIFIED]: 1 
    };
    const priority1 = statusPriority[status1] || 1;
    const priority2 = statusPriority[status2] || 1;
    
    return priority1 >= priority2 ? status1 : status2;
  }

  private extractLeadInfo(userMessage: string, botResponse: string): any {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract name (improved logic)
    let name = null;
    if (lowerMessage.includes('my name is') || lowerMessage.includes("i'm ") || lowerMessage.includes("i am ")) {
      const nameMatch = userMessage.match(/(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i);
      if (nameMatch) name = nameMatch[1];
    } else if (userMessage.length < 20 && /^[a-zA-Z\s]+$/.test(userMessage.trim()) && 
               !lowerMessage.includes('property') && !lowerMessage.includes('want') && 
               !lowerMessage.includes('need') && !lowerMessage.includes('purchase') &&
               !lowerMessage.includes('hi') && !lowerMessage.includes('hello')) {
      // Likely just a name
      name = userMessage.trim();
    }

    // Extract phone number
    const phoneMatch = userMessage.match(/(\+91|91)?[\s-]?[6-9]\d{9}/);
    const phoneNumber = phoneMatch ? phoneMatch[0].replace(/\s/g, '') : null;

    // Extract budget
    let budget = null;
    const budgetMatch = userMessage.match(/(\d+)\s*(lakh|crore|lakhs|crores)/i);
    if (budgetMatch) {
      const amount = parseInt(budgetMatch[1]);
      const unit = budgetMatch[2].toLowerCase();
      budget = unit.includes('lakh') ? amount * 100000 : amount * 10000000;
    }

    // Determine status based on chat behavior
    let status: LeadStatus = LeadStatus.NOT_QUALIFIED;
    let expectations = '';
    let hasPropertyInterest = false;

    // HIGH: Users who really want to purchase, give details, and ask for meetups
    if (this.isHighIntentUser(userMessage, botResponse)) {
      status = LeadStatus.HIGH;
      hasPropertyInterest = true;
    } 
    // MEDIUM: Users who give details like phone number but don't ask for meetups
    else if (this.isMediumIntentUser(userMessage, botResponse)) {
      status = LeadStatus.MEDIUM;
      hasPropertyInterest = true;
    }

    // Build expectations string with more locations
    const propertyKeywords = ['flat', 'apartment', 'house', 'villa', 'bhk', 'bedroom'];
    const locationKeywords = ['mumbai', 'delhi', 'bangalore', 'pune', 'ahmedabad', 'surat', 'tamil nadu', 'tamilnadu', 'chennai', 'gujarat', 'maharashtra', 'karnataka'];
    
    const foundPropertyTypes = propertyKeywords.filter(kw => lowerMessage.includes(kw));
    const foundLocations = locationKeywords.filter(kw => lowerMessage.includes(kw));
    
    if (foundPropertyTypes.length > 0 || foundLocations.length > 0 || budget || lowerMessage.includes('any budget')) {
      expectations = `Looking for: ${foundPropertyTypes.join(', ')} ${foundLocations.length > 0 ? 'in ' + foundLocations.join(', ') : ''} ${budget ? 'budget: ' + budgetMatch[0] : lowerMessage.includes('any budget') ? 'budget: flexible' : ''}`.trim();
    }

    return {
      name,
      phoneNumber,
      budget,
      status,
      expectations: expectations || null,
      hasPropertyInterest
    };
  }

  private isHighIntentUser(userMessage: string, botResponse: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    
    // High intent indicators
    const highIntentKeywords = [
      'buy', 'purchase', 'want to buy', 'ready to buy', 'interested to buy',
      'visit', 'see the property', 'schedule', 'appointment', 'meet',
      'when can i visit', 'can i see', 'viewing', 'inspection',
      'book', 'reserve', 'confirm', 'finalize', 'proceed',
      'contact details', 'agent contact', 'owner contact',
      'loan', 'finance', 'bank', 'emi', 'down payment',
      'ready to invest', 'serious buyer', 'urgent', 'immediately'
    ];

    // Phone number + property interest = high intent
    const hasPhoneNumber = /(\+91|91)?[\s-]?[6-9]\d{9}/.test(userMessage);
    const hasPropertyInterest = ['property', 'flat', 'house', 'villa', 'apartment'].some(kw => lowerMessage.includes(kw));
    
    // Multiple engagement signals
    const hasMultipleSignals = (
      hasPhoneNumber && hasPropertyInterest ||
      highIntentKeywords.filter(kw => lowerMessage.includes(kw)).length >= 2
    );

    return highIntentKeywords.some(keyword => lowerMessage.includes(keyword)) || hasMultipleSignals;
  }

  private isMediumIntentUser(userMessage: string, botResponse: string): boolean {
    const lowerMessage = userMessage.toLowerCase();
    
    // Medium intent indicators
    const mediumIntentKeywords = [
      'property', 'flat', 'house', 'villa', 'apartment', 'bhk',
      'budget', 'price', 'cost', 'location', 'area',
      'looking for', 'want', 'need', 'interested', 'searching',
      'requirements', 'preferences', 'details', 'information'
    ];

    // Has phone number
    const hasPhoneNumber = /(\+91|91)?[\s-]?[6-9]\d{9}/.test(userMessage);
    
    // Has budget mention
    const hasBudget = /(\d+)\s*(lakh|crore|lakhs|crores)/i.test(userMessage) || 
                     lowerMessage.includes('budget') || 
                     lowerMessage.includes('any budget');

    // Has location preference
    const hasLocation = ['mumbai', 'delhi', 'bangalore', 'chennai', 'pune', 'ahmedabad', 'surat', 'tamil nadu', 'tamilnadu', 'gujarat', 'maharashtra', 'karnataka'].some(loc => lowerMessage.includes(loc));

    // Medium if: phone number OR (property interest + any other detail)
    return hasPhoneNumber || 
           (mediumIntentKeywords.some(kw => lowerMessage.includes(kw)) && (hasBudget || hasLocation)) ||
           mediumIntentKeywords.filter(kw => lowerMessage.includes(kw)).length >= 2;
  }
}

// Export a method to check if response contains image sending instruction
export function shouldSendImages(response: string): { shouldSend: boolean; propertyIndex: number } {
  const match = response.match(/\[SEND_IMAGES:(\d+)\]/);
  if (match) {
    return { shouldSend: true, propertyIndex: parseInt(match[1]) };
  }
  return { shouldSend: false, propertyIndex: -1 };
}

export const aiConversationService = new AIConversationService();
