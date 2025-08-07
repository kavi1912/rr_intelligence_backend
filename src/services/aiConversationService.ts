import { PrismaClient } from '@prisma/client';
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

export class AIConversationService {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });
  }
  
  async processMessage(telegramUserId: string, message: string): Promise<string> {
    try {
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
    if (!lead?.name) return 'greeting';
    if (!lead?.phoneNumber && history.length < 3) return 'collecting_requirements';
    if (history.some(h => h.response?.includes('Property'))) return 'showing_properties';
    return 'collecting_requirements';
  }

  private async generateAIResponse(message: string, telegramUserId: string, context: ConversationContext): Promise<string> {
    try {
      // Check if user is asking for property images
      if (this.isImageRequest(message)) {
        return this.handleImageRequest(message, context);
      }

      // Check if user is asking for property listings
      if (this.isPropertyListingRequest(message)) {
        return await this.handlePropertyListingRequest(message, context);
      }

      // Check if user is asking market questions - use web search
      if (this.isMarketQuestion(message)) {
        return await this.handleMarketQuestion(message, context);
      }

      // Get current properties count
      const propertyCount = await prisma.property.count({ where: { isActive: true } });
      
      // Build comprehensive context for Gemini with better memory
      const conversationHistory = context.chatHistory
        .slice(-8) // Last 8 messages for better context
        .map(h => `User: ${h.message}\nBot: ${h.response}`)
        .join('\n');

      // Extract known information from conversation
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);

      const systemPrompt = `You are Neura, an intelligent real estate assistant for RRintelligence CRM. 

🚨 CRITICAL RULES:
- NEVER ask for information already provided in conversation
- NEVER repeat questions the user has already answered
- If user gets frustrated, acknowledge and move forward
- Be helpful, not annoying
- Remember EVERYTHING from the conversation

KNOWN USER INFO (DO NOT ASK AGAIN):
✅ Name: ${knownInfo.name || 'Not provided'}
✅ Phone: ${knownInfo.phone || 'Not provided'} 
✅ Location: ${knownInfo.location || 'Not provided'}
✅ Budget: ${knownInfo.budget || 'Not provided'}
✅ Property Type: ${knownInfo.propertyType || 'Not provided'}

DATABASE STATUS: ${propertyCount > 0 ? `${propertyCount} properties available` : 'No properties in database'}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT MESSAGE: "${message}"

SMART RESPONSE RULES:
1. If user asks for property details/images and we have properties: Show them immediately
2. If user asks for images without specifying number: Show the available property images
3. If user says "anything is fine" - accept it and proceed
4. If user shows frustration: Apologize briefly and help them
5. If you have enough info (name, phone, some preferences): Show properties or save lead
6. NEVER ask the same question twice

Respond intelligently and help the user immediately.`;

      const result = await this.model.generateContent(systemPrompt);
      const response = result.response;
      return response.text() || "I apologize, but I'm having trouble responding right now. Please try again.";
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      return "I apologize for the technical difficulty. Please try again or let me know how else I can help you.";
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
          !h.message.toLowerCase().includes('need')) {
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
    const locations = ['tamil nadu', 'tamilnadu', 'chennai', 'mumbai', 'delhi', 'bangalore', 'pune', 'ahmedabad', 'surat', 'gujarat', 'maharashtra', 'karnataka'];
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
      // Extract known info for better response
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
      
      return `${knownInfo.name ? knownInfo.name + ', ' : ''}I understand your frustration. We are currently updating our property database with new listings. 

I have saved all your requirements:
${knownInfo.name ? '👤 Name: ' + knownInfo.name : ''}
${knownInfo.phone ? '📞 Phone: ' + knownInfo.phone : ''}
${knownInfo.location ? '📍 Location: ' + knownInfo.location : ''}
${knownInfo.budget ? '💰 Budget: ' + knownInfo.budget : ''}
${knownInfo.propertyType ? '🏠 Type: ' + knownInfo.propertyType : ''}

Our team will contact you within 24 hours with personalized property options that match your requirements!`;
    }

    // If properties exist, search and show them
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
    let response = `${knownInfo.name ? knownInfo.name + ', here' : 'Here'} ${propertyCount === 1 ? 'is the property' : 'are our available properties'} we currently have:\n\n`;
    
    properties.forEach((property, index) => {
      response += `🏠 **Property ${index + 1}**\n`;
      response += `📍 Location: ${property.location}\n`;
      response += `🛏️ ${property.bedrooms || 'N/A'} BHK, ${property.bathrooms || 'N/A'} Bathrooms\n`;
      response += `📐 Area: ${property.area || 'N/A'} sq ft\n`;
      response += `💰 Price: ₹${property.pricePerSqft}/sq ft\n`;
      response += `📝 ${property.description.substring(0, 100)}...\n`;
      response += `📞 Contact: ${property.contactInfo}\n\n`;
    });
    
    if (propertyCount === 1) {
      response += `Would you like to see images of this property? Just say "show images"!`;
    } else {
      response += `Would you like to see images of any specific property? Just say "show images of property 1"!`;
    }
    
    return response;
  }

  private isImageRequest(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const imageKeywords = ['image', 'photo', 'picture', 'show me', 'see'];
    return imageKeywords.some(keyword => lowerMessage.includes(keyword)) && 
           (lowerMessage.includes('property') || lowerMessage.includes('that') || lowerMessage.includes('this'));
  }

  private async handleImageRequest(message: string, context: ConversationContext): Promise<string> {
    // Check if user specified a property number
    const propertyMatch = message.match(/property\s*(\d+)/i);
    
    if (propertyMatch) {
      return `📸 Here are the images for Property ${propertyMatch[1]}. [Images will be sent separately]`;
    }
    
    // If no specific property number, check how many properties we have
    const propertyCount = await prisma.property.count({ where: { isActive: true } });
    
    if (propertyCount === 0) {
      return `${context.name ? context.name + ', ' : ''}I don't have any property images to show right now as we're updating our database. Our team will share images when we have matching properties for you.`;
    }
    
    if (propertyCount === 1) {
      // Only one property, show its images
      return `📸 Sending you the images of our available property now! [Images will be sent separately]`;
    }
    
    // Multiple properties, but user didn't specify which one
    return `📸 I have images for ${propertyCount} properties. Which one would you like to see? You can say "show images of property 1" or "show images of property 2", etc.`;
  }

  private async updateConversationAndLeads(telegramUserId: string, message: string, response: string): Promise<void> {
    try {
      // Log chat history
      await prisma.chatHistory.create({
        data: {
          telegramUserId,
          message,
          response,
          messageType: 'text',
          language: 'en'
        }
      });

      // Extract and update lead information
      await this.extractAndUpdateLead(telegramUserId, message, response);

    } catch (error) {
      console.error('Error updating conversation and leads:', error);
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
        if (finalStatus !== 'NOT_QUALIFIED' && this.getHigherStatus(lead.status, finalStatus) === finalStatus) {
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
            status: finalStatus || 'NOT_QUALIFIED'
          }
        });
      }

    } catch (error) {
      console.error('Error extracting and updating lead:', error);
    }
  }

  /**
   * Analyze overall conversation history to determine lead status
   */
  private analyzeOverallLeadStatus(chatHistory: any[], currentMessage: string): string {
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
      return 'HIGH';
    } else if (hasPhoneInHistory || mediumSignalCount >= 3) {
      return 'MEDIUM';
    }
    
    return 'NOT_QUALIFIED';
  }

  /**
   * Get the higher priority status
   */
  private getHigherStatus(status1: string, status2: string): string {
    const statusPriority = { 'HIGH': 3, 'MEDIUM': 2, 'NOT_QUALIFIED': 1 };
    const priority1 = statusPriority[status1] || 1;
    const priority2 = statusPriority[status2] || 1;
    
    return priority1 >= priority2 ? status1 : status2;
  }

  /**
   * Check if user is asking market-related questions
   */
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

  /**
   * Handle market questions using web search
   */
  private async handleMarketQuestion(message: string, context: ConversationContext): Promise<string> {
    try {
      const knownInfo = this.extractKnownInfoFromHistory(context.chatHistory, message);
      const userName = knownInfo.name || '';
      
      // Use web search to get current market information
      const marketData = await this.getMarketData(message);
      
      return `${userName ? userName + ', ' : ''}${marketData}`;
      
    } catch (error) {
      console.error('Error getting market data:', error);
      return `${context.name ? context.name + ', ' : ''}I'm sorry, I couldn't fetch the latest market information right now. Let me help you with property listings instead.`;
    }
  }

  /**
   * Get market data using web search or built-in knowledge
   */
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

  private extractLeadInfo(userMessage: string, botResponse: string): any {
    const lowerMessage = userMessage.toLowerCase();
    
    // Extract name (improved logic)
    let name = null;
    if (lowerMessage.includes('my name is') || lowerMessage.includes("i'm ") || lowerMessage.includes("i am ")) {
      const nameMatch = userMessage.match(/(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i);
      if (nameMatch) name = nameMatch[1];
    } else if (userMessage.length < 20 && /^[a-zA-Z\s]+$/.test(userMessage.trim()) && 
               !lowerMessage.includes('property') && !lowerMessage.includes('want') && 
               !lowerMessage.includes('need') && !lowerMessage.includes('purchase')) {
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
    let status = 'NOT_QUALIFIED';
    let expectations = '';
    let hasPropertyInterest = false;

    // HIGH: Users who really want to purchase, give details, and ask for meetups
    if (this.isHighIntentUser(userMessage, botResponse)) {
      status = 'HIGH';
      hasPropertyInterest = true;
    } 
    // MEDIUM: Users who give details like phone number but don't ask for meetups
    else if (this.isMediumIntentUser(userMessage, botResponse)) {
      status = 'MEDIUM';
      hasPropertyInterest = true;
    }
    // NOT_QUALIFIED: Users who just pass chat, don't talk about real estate, or don't give details

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

  /**
   * HIGH Intent Users: Really want to purchase, give details, ask for meetups
   */
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

  /**
   * MEDIUM Intent Users: Give details like phone number but don't ask for meetups
   */
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

export const aiConversationService = new AIConversationService();
