import TelegramBot from 'node-telegram-bot-api';
interface TelegramBotService {
    bot: TelegramBot;
    startBot(): void;
    stopBot(): void;
    sendMessage(chatId: number, text: string): Promise<void>;
}
declare class TelegramBotServiceImpl implements TelegramBotService {
    bot: TelegramBot;
    private model;
    constructor();
    private setupHandlers;
    private generateAIResponse;
    private logChatHistory;
    private updateLead;
    private analyzeIntent;
    sendMessage(chatId: number, text: string): Promise<void>;
    startBot(): void;
    stopBot(): void;
}
export declare const telegramService: TelegramBotServiceImpl;
export {};
//# sourceMappingURL=telegramService.d.ts.map