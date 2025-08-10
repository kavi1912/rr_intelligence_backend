import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../db/prisma';
import { Request, Response } from 'express';
import { multiUserTelegramService } from '../services/multiUserTelegramService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const router = Router();

// Get user's Telegram bot configuration
router.get('/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramBotToken: true,
        telegramBotInstructions: true,
        telegramBotActive: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't expose the full token for security
    const maskedToken = user.telegramBotToken 
      ? `${user.telegramBotToken.substring(0, 10)}...` 
      : null;

    res.json({
      hasToken: !!user.telegramBotToken,
      maskedToken,
      instructions: user.telegramBotInstructions,
      isActive: user.telegramBotActive
    });
  } catch (error) {
    console.error('Error fetching Telegram config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user's Telegram bot configuration
router.put('/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token, instructions, isActive } = req.body;

    // Basic validation
    if (token && !token.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return res.status(400).json({ 
        error: 'Invalid Telegram bot token format. Should be like: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' 
      });
    }

    // Check if token is already used by another user
    if (token) {
      const existingUser = await prisma.user.findFirst({
        where: {
          telegramBotToken: token,
          id: { not: userId } // Exclude current user
        },
        select: { username: true }
      });

      if (existingUser) {
        return res.status(400).json({ 
          error: `This bot token is already being used by another user (${existingUser.username}). Each bot token can only be used by one user.` 
        });
      }
    }

    // Get current config to check if bot needs restarting
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramBotToken: true, telegramBotActive: true }
    });

    const updateData: any = {};
    if (token !== undefined) updateData.telegramBotToken = token;
    if (instructions !== undefined) updateData.telegramBotInstructions = instructions;
    if (isActive !== undefined) updateData.telegramBotActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        telegramBotToken: true,
        telegramBotInstructions: true,
        telegramBotActive: true
      }
    });

    // Handle bot instance management
    if (updatedUser.telegramBotActive && updatedUser.telegramBotToken) {
      // Start or restart the bot with new token
      console.log(`🤖 Starting bot for user ${userId} with token ${updatedUser.telegramBotToken.substring(0, 10)}...`);
      const result = await multiUserTelegramService.startUserBot(userId, updatedUser.telegramBotToken);
      console.log(`🤖 Bot start result:`, result);
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Bot configuration saved but failed to start bot: ' + result.error 
        });
      }
    } else {
      // Stop the bot if it's disabled or no token
      console.log(`🤖 Stopping bot for user ${userId}`);
      await multiUserTelegramService.stopUserBot(userId);
    }

    // Don't expose the full token
    const maskedToken = updatedUser.telegramBotToken 
      ? `${updatedUser.telegramBotToken.substring(0, 10)}...` 
      : null;

    res.json({
      hasToken: !!updatedUser.telegramBotToken,
      maskedToken,
      instructions: updatedUser.telegramBotInstructions,
      isActive: updatedUser.telegramBotActive,
      message: updatedUser.telegramBotActive ? 'Telegram bot started successfully!' : 'Telegram bot configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating Telegram config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Telegram bot connection
router.post('/test', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body; // Allow token to be sent in request body
    
    let botToken = token; // Use token from request body if provided
    
    // If no token provided in request, use saved token
    if (!botToken) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramBotToken: true }
      });

      if (!user?.telegramBotToken) {
        return res.status(400).json({ error: 'No Telegram bot token configured. Please provide a token to test or save one first.' });
      }
      
      botToken = user.telegramBotToken;
    }

    // Validate token format
    if (!botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return res.status(400).json({ 
        error: 'Invalid bot token format. Should be like: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' 
      });
    }

    // Test the bot token by calling Telegram API
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();

    if (data.ok) {
      res.json({
        success: true,
        botInfo: {
          username: data.result.username,
          firstName: data.result.first_name,
          canJoinGroups: data.result.can_join_groups,
          canReadAllGroupMessages: data.result.can_read_all_group_messages
        },
        message: 'Bot connection successful!'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid bot token or bot configuration error',
        details: data.description
      });
    }
  } catch (error) {
    console.error('Error testing Telegram bot:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test bot connection. Please check your token.' 
    });
  }
});

// Get bot status
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramBotActive: true,
        telegramBotToken: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const botInstance = multiUserTelegramService.getUserBot(userId);
    const isRunning = !!botInstance;
    const activeBots = multiUserTelegramService.getActiveBotCount();
    const activeBotsInfo = multiUserTelegramService.getActiveBotsInfo();

    console.log(`🔍 Bot status check for user ${userId}:`);
    console.log(`   - Has token: ${!!user.telegramBotToken}`);
    console.log(`   - Is active: ${user.telegramBotActive}`);
    console.log(`   - Is running: ${isRunning}`);
    console.log(`   - Total active bots: ${activeBots}`);
    console.log(`   - Active bots info:`, activeBotsInfo);

    res.json({
      isConfigured: !!user.telegramBotToken,
      isActive: user.telegramBotActive,
      isRunning,
      activeBots,
      activeBotsInfo,
      message: isRunning ? 'Bot is running' : 'Bot is not running',
      userId,
      debug: {
        hasToken: !!user.telegramBotToken,
        tokenStart: user.telegramBotToken ? user.telegramBotToken.substring(0, 10) : null
      }
    });
  } catch (error) {
    console.error('Error getting bot status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user's Telegram bot token
router.delete('/config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    // Stop the bot first
    await multiUserTelegramService.stopUserBot(userId);
    
    // Remove token from database
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramBotToken: null,
        telegramBotActive: false
      }
    });

    res.json({
      success: true,
      message: 'Telegram bot token deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Telegram token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
