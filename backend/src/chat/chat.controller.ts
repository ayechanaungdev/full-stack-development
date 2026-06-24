import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('conversations')
    async getConversations(@Request() req: any) {
        return this.chatService.getConversations(req.user.userId);
    }

    @Get('history/:userId')
    async getHistory(
        @Param('userId', ParseIntPipe) chatPartnerId: number,
        @Request() req: any,
    ) {
        return this.chatService.getChatHistory(req.user.userId, chatPartnerId);
    }

    @Patch('messages/read')
    async markMessagesAsRead(
        @Body() body: { partnerId: number },
        @Request() req: any,
    ) {
        return this.chatService.markMessagesAsRead(req.user.userId, body.partnerId);
    }
}
