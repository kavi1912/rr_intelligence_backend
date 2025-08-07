import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db/prisma';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface PropertySearchContext {
  state?: string;
  city?: string;
  propertyType?: string;
  budget?: number;
  searchStep: 'location' | 'properties' | 'details' | 'completed';
}

interface UserSession {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  currentFlow?: 'property_search' | 'property_details' | 'general_chat';
  searchContext?: PropertySearchContext;
  selectedPropertyId?: string;
  lastActivity: Date;
}

class EnhancedTelegramBotService {
  public bot: TelegramBot;
  private model: any;
  private userSessions: Map<string, UserSession> = new Map();

  // Indian states and major cities
  private readonly INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi', 'Mumbai'
  ];

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      }
    });

    this.setupHandlers();
    this.startSessionCleanup();
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // Handle property search command
    this.bot.onText(/\/properties/, async (msg) => {
      await this.handlePropertySearch(msg);
    });

    // Handle help command  
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg);
    });

    // Handle all text messages
    this.bot.on('message', async (msg) => {
      if (msg.text?.startsWith('/')) return; // Skip commands
      await this.handleMessage(msg);
    });

    // Handle callback queries (inline buttons)
    this.bot.on('callback_query', async (query) => {
      await this.handleCallbackQuery(query);
    });

    // Handle errors
    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
    });
  }

  private async handleStart(msg: any) {
    const chatId = msg.chat.id;
    const user = msg.from;
    const telegramUserId = String(user?.id || '');

    // Create or update user session
    const session: UserSession = {
      userId: telegramUserId,
      username: user?.username,
      firstName: user?.first_name,
      lastName: user?.last_name,
      currentFlow: 'general_chat',
      lastActivity: new Date()
    };
    this.userSessions.set(telegramUserId, session);

    const welcomeMessage = `🏠 Welcome to RRintelligence CRM, ${user?.first_name || 'there'}!

I'm your AI real estate assistant with access to our property database across India.

🎯 **What I can help you with:**
• 🔍 Browse properties by location (state/city)
• 📸 View property images and details
• 💰 Check prices and specifications
• 📞 Connect with our expert agents
• 📊 Get market insights and valuations

🚀 **Quick Commands:**
• /properties - Browse available properties
• /help - Show all available commands

💬 **Or just tell me what you're looking for!**
Example: "I need a 3BHK in Mumbai under 2 crores"

How can I assist you today?`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔍 Browse Properties', callback_data: 'browse_properties' },
          { text: '📞 Contact Agent', callback_data: 'contact_agent' }
        ],
        [
          { text: '💡 Property Insights', callback_data: 'market_insights' },
          { text: '❓ Help', callback_data: 'help' }
        ]
      ]
    };

    await this.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
    await this.logChatHistory(telegramUserId, '/start', welcomeMessage, session);
  }

  private async handlePropertySearch(msg: any) {
    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from?.id || '');
    const session = this.userSessions.get(telegramUserId);

    if (session) {
      session.currentFlow = 'property_search';
      session.searchContext = { searchStep: 'location' };
      session.lastActivity = new Date();
    }

    const message = `🔍 **Property Search in India**

Let's find the perfect property for you! Please tell me:

🌍 **Which state or city are you interested in?**

Some popular options:
• Mumbai, Maharashtra
• Delhi NCR
• Bangalore, Karnataka  
• Pune, Maharashtra
• Hyderabad, Telangana
• Chennai, Tamil Nadu
• Gurgaon, Haryana
• Noida, Uttar Pradesh

Just type the state or city name, for example: "Maharashtra" or "Mumbai"`;

    await this.sendMessage(chatId, message);
    await this.logChatHistory(telegramUserId, '/properties', message, session);
  }

  private async handleHelp(msg: any) {
    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from?.id || '');
    const session = this.userSessions.get(telegramUserId);

    const helpMessage = `🤖 **RRintelligence Bot Help**

**🎯 Commands:**
• /start - Welcome message and main menu
• /properties - Browse properties by location
• /help - Show this help message

**🔍 Property Search:**
1. Use /properties or say "show properties in [location]"
2. Specify state/city when prompted
3. Browse property listings with details
4. Request images for specific properties
5. Get contact information for interested properties

**💬 Natural Conversation:**
You can also chat naturally! Try:
• "I need a house in Delhi under 50 lakhs"
• "Show me flats in Mumbai"
• "Properties in Bangalore with 3 bedrooms"
• "Send images of property ID #123"

**📞 Contact & Support:**
• Ask for agent contact: "Connect me with an agent"
• Report issues: "I have a problem"
• Feedback: "I want to give feedback"

**🏠 Property Features:**
• View detailed property information
• See high-quality property images  
• Get pricing and area details
• Contact information for inquiries
• Property location and amenities

Need more help? Just ask me anything!`;

    await this.sendMessage(chatId, helpMessage);
    await this.logChatHistory(telegramUserId, '/help', helpMessage, session);
  }

  private async handleMessage(msg: any) {
    const chatId = msg.chat.id;
    const telegramUserId = String(msg.from?.id || '');
    const userMessage = msg.text || '';
    const user = msg.from;

    try {
      // Get or create user session
      let session = this.userSessions.get(telegramUserId);
      if (!session) {
        session = {
          userId: telegramUserId,
          username: user?.username,
          firstName: user?.first_name,
          lastName: user?.last_name,
          currentFlow: 'general_chat',
          lastActivity: new Date()
        };
        this.userSessions.set(telegramUserId, session);
      } else {
        session.lastActivity = new Date();
      }

      // Process based on current flow
      let response: string;
      
      if (session.currentFlow === 'property_search' && session.searchContext) {
        response = await this.handlePropertySearchFlow(userMessage, session, chatId);
      } else if (session.currentFlow === 'property_details') {
        response = await this.handlePropertyDetailsFlow(userMessage, session, chatId);
      } else {
        response = await this.handleGeneralChat(userMessage, session, chatId);
      }

      // Log the conversation
      await this.logChatHistory(telegramUserId, userMessage, response, session);
      
      // Update or create lead
      await this.updateLead(telegramUserId, userMessage, response, session);

    } catch (error) {
      console.error('Error handling message:', error);
      await this.sendMessage(chatId, '🔧 Sorry, I encountered an error. Please try again or use /start to restart.');
    }
  }

  private async handlePropertySearchFlow(userMessage: string, session: UserSession, chatId: number): Promise<string> {
    const context = session.searchContext!;

    switch (context.searchStep) {
      case 'location':
        return await this.processLocationInput(userMessage, session, chatId);
      case 'properties':
        return await this.processPropertySelection(userMessage, session, chatId);
      default:
        return await this.handleGeneralChat(userMessage, session, chatId);
    }
  }

  private async processLocationInput(userMessage: string, session: UserSession, chatId: number): Promise<string> {
    const location = userMessage.trim();
    const context = session.searchContext!;

    // Check if it's a valid Indian state or major city
    const isValidLocation = this.INDIAN_STATES.some(state => 
      location.toLowerCase().includes(state.toLowerCase()) || 
      state.toLowerCase().includes(location.toLowerCase())
    );

    if (!isValidLocation && location.length < 3) {
      return `🤔 I didn't recognize "${location}" as an Indian state or city.

Please specify a state or major city like:
• Maharashtra, Karnataka, Delhi, Tamil Nadu
• Mumbai, Bangalore, Chennai, Pune, Hyderabad

Try again with a valid location:`;
    }

    // Search for properties in the specified location
    const properties = await this.searchPropertiesByLocation(location);

    if (properties.length === 0) {
      context.searchStep = 'completed';
      return `😔 **No Properties Found in ${location}**

Unfortunately, we don't have any active properties in ${location} right now.

🔄 **What you can do:**
• Try a different location: /properties
• Get notified when properties are available
• Speak with our agent for off-market options

Would you like to:
1. Search in a different location
2. Leave your contact details for future notifications
3. Speak with an agent`;
    }

    // Store search results and show properties
    context.state = location;
    context.searchStep = 'properties';
    
    return await this.displayPropertyListings(properties, location, chatId);
  }

  private async searchPropertiesByLocation(location: string): Promise<any[]> {
    try {
      const properties = await prisma.property.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { location: { contains: location, mode: 'insensitive' } },
                { description: { contains: location, mode: 'insensitive' } }
              ]
            }
          ]
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
        },
        orderBy: { createdAt: 'desc' },
        take: 10 // Limit to 10 properties for better UX
      });

      return properties;
    } catch (error) {
      console.error('Error searching properties:', error);
      return [];
    }
  }

  private async displayPropertyListings(properties: any[], location: string, chatId: number): Promise<string> {
    let message = `🏠 **Found ${properties.length} Properties in ${location}**\n\n`;

    const keyboard: any = { inline_keyboard: [] };

    for (let i = 0; i < Math.min(properties.length, 5); i++) {
      const property = properties[i];
      const price = property.area ? 
        (Number(property.pricePerSqft) * Number(property.area)).toLocaleString('en-IN') : 
        'Price on request';
      
      message += `🏘️ **Property ${i + 1}**\n`;
      message += `📍 Location: ${property.location}\n`;
      message += `🏠 Type: ${property.propertyType || 'Residential'}\n`;
      message += `📐 Area: ${property.area ? `${property.area} sq ft` : 'Not specified'}\n`;
      message += `💰 Price: ₹${price}\n`;
      message += `🛏️ Bedrooms: ${property.bedrooms || 'Not specified'}\n`;
      message += `🚿 Bathrooms: ${property.bathrooms || 'Not specified'}\n`;
      message += `📝 ${property.description.substring(0, 100)}${property.description.length > 100 ? '...' : ''}\n\n`;

      // Add inline button for each property
      keyboard.inline_keyboard.push([
        { text: `📸 View Images - Property ${i + 1}`, callback_data: `view_images_${property.id}` },
        { text: `📞 Contact`, callback_data: `contact_${property.id}` }
      ]);
    }

    if (properties.length > 5) {
      message += `📋 *Showing first 5 properties. ${properties.length - 5} more available.*\n\n`;
      keyboard.inline_keyboard.push([
        { text: '📄 View More Properties', callback_data: `more_properties_${location}` }
      ]);
    }

    keyboard.inline_keyboard.push([
      { text: '🔍 New Search', callback_data: 'browse_properties' },
      { text: '🏠 Main Menu', callback_data: 'main_menu' }
    ]);

    // Send the message with inline keyboard
    await this.bot.sendMessage(chatId, message, { 
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });

    return message;
  }

  private async handleCallbackQuery(query: any) {
    const chatId = query.message.chat.id;
    const telegramUserId = String(query.from.id);
    const data = query.data;

    // Acknowledge the callback query
    await this.bot.answerCallbackQuery(query.id);

    const session = this.userSessions.get(telegramUserId);

    try {
      if (data === 'browse_properties') {
        await this.handlePropertySearch({ chat: { id: chatId }, from: query.from });
      } else if (data === 'main_menu') {
        await this.handleStart({ chat: { id: chatId }, from: query.from });
      } else if (data.startsWith('view_images_')) {
        const propertyId = data.replace('view_images_', '');
        await this.sendPropertyImages(chatId, propertyId, session);
      } else if (data.startsWith('contact_')) {
        const propertyId = data.replace('contact_', '');
        await this.sendContactInfo(chatId, propertyId, session);
      } else if (data === 'contact_agent') {
        await this.sendAgentContact(chatId, session);
      } else if (data === 'help') {
        await this.handleHelp({ chat: { id: chatId }, from: query.from });
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      await this.sendMessage(chatId, '🔧 Error processing your request. Please try again.');
    }
  }

  private async sendPropertyImages(chatId: number, propertyId: string, session?: UserSession) {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          user: {
            select: {
              username: true,
              companyName: true,
              phoneNumber: true,
              email: true
            }
          }
        }
      });

      if (!property) {
        await this.sendMessage(chatId, '❌ Property not found.');
        return;
      }

      const images = property.images as string[];
      
      if (!images || images.length === 0) {
        await this.sendMessage(chatId, '📷 No images available for this property.\n\n📞 Contact our agent for more details.');
        return;
      }

      // Send property details first
      const details = `🏠 **Property Details**\n\n` +
        `📍 **Location:** ${property.location}\n` +
        `🏠 **Type:** ${property.propertyType || 'Residential'}\n` +
        `📐 **Area:** ${property.area ? `${property.area} sq ft` : 'Contact for details'}\n` +
        `💰 **Price:** ₹${property.pricePerSqft}/sq ft\n` +
        `🛏️ **Bedrooms:** ${property.bedrooms || 'Contact for details'}\n` +
        `🚿 **Bathrooms:** ${property.bathrooms || 'Contact for details'}\n\n` +
        `📝 **Description:**\n${property.description}\n\n` +
        `📞 **Contact:** ${property.contactInfo}`;

      await this.sendMessage(chatId, details);

      // Send images (up to 5 at once due to Telegram limits)
      const imagesToSend = images.slice(0, 5);
      
      for (let i = 0; i < imagesToSend.length; i++) {
        try {
          const imageBuffer = Buffer.from(imagesToSend[i], 'base64');
          const caption = i === 0 ? `📸 Property Image ${i + 1}/${imagesToSend.length}` : `📸 Image ${i + 1}/${imagesToSend.length}`;
          
          await this.bot.sendPhoto(chatId, imageBuffer, { caption });
          
          // Small delay between images to avoid rate limiting
          if (i < imagesToSend.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (imageError) {
          console.error(`Error sending image ${i + 1}:`, imageError);
          await this.sendMessage(chatId, `❌ Error sending image ${i + 1}. Please contact our agent for this image.`);
        }
      }

      if (images.length > 5) {
        await this.sendMessage(chatId, `📷 Showing first 5 images. ${images.length - 5} more images available. Contact our agent to see all images.`);
      }

      // Add contact button
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📞 Contact for this Property', callback_data: `contact_${propertyId}` },
            { text: '🔍 More Properties', callback_data: 'browse_properties' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, '💡 Interested in this property?', { reply_markup: keyboard });

      // Log interaction
      if (session) {
        await this.logChatHistory(session.userId, `Viewed images for property ${propertyId}`, 'Sent property images and details', session);
      }

    } catch (error) {
      console.error('Error sending property images:', error);
      await this.sendMessage(chatId, '🔧 Error loading property images. Please try again or contact our agent.');
    }
  }

  private async sendContactInfo(chatId: number, propertyId: string, session?: UserSession) {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          user: {
            select: {
              username: true,
              companyName: true,
              phoneNumber: true,
              email: true
            }
          }
        }
      });

      if (!property) {
        await this.sendMessage(chatId, '❌ Property not found.');
        return;
      }

      const contactMessage = `📞 **Contact Information**\n\n` +
        `🏠 **Property:** ${property.location}\n` +
        `🏢 **Company:** ${property.user.companyName}\n` +
        `👤 **Agent:** ${property.user.username}\n` +
        `📱 **Phone:** ${property.user.phoneNumber}\n` +
        `📧 **Email:** ${property.user.email}\n` +
        `📞 **Direct Contact:** ${property.contactInfo}\n\n` +
        `💬 **Message Template:**\n` +
        `"Hi, I'm interested in your property in ${property.location}. Can we schedule a visit?"\n\n` +
        `🚀 **Our team will also contact you within 24 hours!**`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📱 Call Now', url: `tel:${property.user.phoneNumber}` },
            { text: '📧 Send Email', url: `mailto:${property.user.email}` }
          ],
          [
            { text: '🔍 More Properties', callback_data: 'browse_properties' }
          ]
        ]
      };

      await this.bot.sendMessage(chatId, contactMessage, { reply_markup: keyboard });

      // Mark as high-intent lead
      if (session) {
        await this.updateLeadStatus(session.userId, 'HIGH', `Requested contact for property ${propertyId}`, session);
        await this.logChatHistory(session.userId, `Requested contact for property ${propertyId}`, contactMessage, session);
      }

    } catch (error) {
      console.error('Error sending contact info:', error);
      await this.sendMessage(chatId, '🔧 Error loading contact information. Please try again.');
    }
  }

  private async sendAgentContact(chatId: number, session?: UserSession) {
    const message = `📞 **Contact Our Expert Agents**\n\n` +
      `🏢 **RRintelligence CRM**\n` +
      `📱 **Phone:** +91 9999999999\n` +
      `📧 **Email:** contact@rrintelligence.com\n` +
      `🌐 **Website:** www.rrintelligence.com\n\n` +
      `⏰ **Working Hours:** Mon-Sat, 9 AM - 7 PM\n\n` +
      `💬 **What our agents can help with:**\n` +
      `• Property consultations\n` +
      `• Site visits and tours\n` +
      `• Legal documentation\n` +
      `• Loan assistance\n` +
      `• Investment advice\n\n` +
      `🚀 **We'll contact you within 24 hours!**`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📱 Call Now', url: 'tel:+919999999999' },
          { text: '📧 Send Email', url: 'mailto:contact@rrintelligence.com' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });

    if (session) {
      await this.updateLeadStatus(session.userId, 'HIGH', 'Requested agent contact', session);
    }
  }

  private async handleGeneralChat(userMessage: string, session: UserSession, chatId: number): Promise<string> {
    // Check if user is asking for properties
    const propertyKeywords = ['property', 'properties', 'house', 'flat', 'apartment', 'villa', 'plot', 'land'];
    const locationKeywords = this.INDIAN_STATES.map(s => s.toLowerCase());
    
    const message = userMessage.toLowerCase();
    const isPropertyQuery = propertyKeywords.some(keyword => message.includes(keyword));
    const hasLocation = locationKeywords.some(location => message.includes(location));

    if (isPropertyQuery) {
      if (hasLocation) {
        // Extract location and start property search
        const location = locationKeywords.find(loc => message.includes(loc)) || '';
        if (location) {
          session.currentFlow = 'property_search';
          session.searchContext = { searchStep: 'location' };
          return await this.processLocationInput(location, session, chatId);
        }
      } else {
        // Ask for location
        session.currentFlow = 'property_search';
        session.searchContext = { searchStep: 'location' };
        return `🔍 **Property Search**\n\nI'd love to help you find properties! Which state or city in India are you interested in?\n\nExample: "Mumbai", "Maharashtra", "Bangalore", etc.`;
      }
    }

    // Generate AI response for general chat
    return await this.generateAIResponse(userMessage, session);
  }

  private async generateAIResponse(userMessage: string, session: UserSession): Promise<string> {
    try {
      // Get recent chat history
      const recentHistory = await prisma.chatHistory.findMany({
        where: { telegramUserId: session.userId },
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      const propertyCount = await prisma.property.count({ where: { isActive: true } });
      
      const context = `You are RRintelligence CRM's AI assistant for real estate in India.

User Details:
- Name: ${session.firstName || 'Not provided'} ${session.lastName || ''}
- Username: @${session.username || 'Not provided'}
- Telegram ID: ${session.userId}

Recent conversation:
${recentHistory.map(h => `User: ${h.message}\nBot: ${h.response || 'No response'}`).join('\n')}

Current database status: ${propertyCount} active properties across India

Guidelines:
- Be helpful, professional, and focused on Indian real estate
- For property searches, guide users to use /properties command
- Ask qualifying questions: budget, location (state/city), property type, size
- Collect contact info (WhatsApp/phone) for high-intent users
- For property queries, offer to show available properties with images
- Classify intent: HIGH (ready to buy/visit), MEDIUM (researching), LOW (browsing)
- Mention specific Indian cities/states when relevant
- Keep responses concise but informative
- Always offer to connect with agents for serious inquiries

Current user message: "${userMessage}"

Respond naturally and helpfully:`;

      const result = await this.model.generateContent(context);
      return result.response.text() || 'I apologize, but I couldn\'t generate a proper response. Please try again.';
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize for the technical difficulty. Please try /help or contact our support team.';
    }
  }

  private async processPropertySelection(userMessage: string, session: UserSession, chatId: number): Promise<string> {
    // This handles when user is in property selection flow
    // Can be extended for specific property interactions
    return await this.handleGeneralChat(userMessage, session, chatId);
  }

  private async handlePropertyDetailsFlow(userMessage: string, session: UserSession, chatId: number): Promise<string> {
    // This handles when user is viewing specific property details
    // Can be extended for property-specific interactions
    return await this.handleGeneralChat(userMessage, session, chatId);
  }

  private async logChatHistory(telegramUserId: string, message: string, response: string, session?: UserSession): Promise<void> {
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

  private async updateLead(telegramUserId: string, userMessage: string, botResponse: string, session: UserSession): Promise<void> {
    try {
      const intent = this.analyzeIntent(userMessage, botResponse);
      
      if (intent.status === 'NOT_QUALIFIED') return;

      // Create lead data with Telegram user info
      const leadData = {
        telegramUserId,
        name: session.firstName && session.lastName ? 
          `${session.firstName} ${session.lastName}` : 
          (session.firstName || session.username || null),
        status: intent.status,
        phoneNumber: intent.phoneNumber,
        budget: intent.budget,
        expectations: intent.expectations || userMessage,
        language: 'en'
      };

      // Find or create lead
      const existingLead = await prisma.lead.findFirst({ where: { telegramUserId } });
      
      if (existingLead) {
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            name: leadData.name || existingLead.name,
            status: intent.status,
            phoneNumber: intent.phoneNumber || existingLead.phoneNumber,
            budget: intent.budget || existingLead.budget,
            expectations: intent.expectations || existingLead.expectations
          }
        });
      } else {
        await prisma.lead.create({ data: leadData });
      }

    } catch (error) {
      console.error('Error updating lead:', error);
    }
  }

  private async updateLeadStatus(telegramUserId: string, status: 'HIGH' | 'MEDIUM' | 'NOT_QUALIFIED', activity: string, session: UserSession): Promise<void> {
    try {
      const existingLead = await prisma.lead.findFirst({ where: { telegramUserId } });
      
      if (existingLead) {
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: { 
            status: status as any,
            expectations: `${existingLead.expectations || ''}\n${activity}`.trim()
          }
        });

        // Create follow-up for high-intent activities
        if (status === 'HIGH') {
          await prisma.followUp.create({
            data: {
              leadId: existingLead.id,
              activity: `Follow up: ${activity}`,
              status: 'PENDING'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  }

  private analyzeIntent(userMessage: string, botResponse: string): any {
    const message = userMessage.toLowerCase();
    
    // High intent indicators
    if (message.includes('buy') || message.includes('purchase') || 
        message.includes('visit') || message.includes('contact') ||
        message.includes('call') || message.includes('meet') ||
        message.includes('interested') || message.includes('book')) {
      return { status: 'HIGH' };
    }
    
    // Medium intent indicators
    if (message.includes('property') || message.includes('house') ||
        message.includes('flat') || message.includes('price') ||
        message.includes('location') || message.includes('details')) {
      return { status: 'MEDIUM' };
    }
    
    return { status: 'NOT_QUALIFIED' };
  }

  private startSessionCleanup() {
    // Clean up inactive sessions every hour
    setInterval(() => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      for (const [userId, session] of this.userSessions.entries()) {
        if (session.lastActivity < oneHourAgo) {
          this.userSessions.delete(userId);
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  public async sendMessage(chatId: number, text: string, options?: any): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, text, options);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  public startBot(): void {
    console.log('🤖 Enhanced Telegram bot started successfully');
  }

  public stopBot(): void {
    this.bot.stopPolling();
    console.log('🤖 Enhanced Telegram bot stopped');
  }
}

export const enhancedTelegramBotService = new EnhancedTelegramBotService();
