import { Controller, Get, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ChatService } from './chat.service';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    // Fetch chat history between the logged-in user and another user
    @Get('history/:userId')
    async getHistory(
        @Param('userId', ParseIntPipe) chatPartnerId: number,
        @Request() req: any,
    ) {
        const currentUser = req.user;

        // Returns history between the current authenticated user and the requested partner ID
        return this.chatService.getChatHistory(currentUser.userId, chatPartnerId);
    }
}
