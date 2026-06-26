import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthenticatedRequest } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async getConversations(@Request() req: AuthenticatedRequest) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('history/:userId')
  async getHistory(
    @Param('userId', ParseIntPipe) chatPartnerId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatService.getChatHistory(req.user.userId, chatPartnerId);
  }

  @Post('send')
  async sendMessage(
    @Body() body: { receiverId: number; content: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const message = await this.chatService.saveMessage(
      req.user.userId,
      body.receiverId,
      body.content,
    );

    const formattedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      senderId: message.senderId,
      receiverId: message.receiverId,
      isRead: message.isRead,
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        name: message.sender.name,
        fullName: message.sender.profile?.full_name || message.sender.name,
        avatarUrl: message.sender.profile?.avatar_url || null,
      },
    };

    this.chatGateway.emitToUser(
      body.receiverId,
      'newMessage',
      formattedMessage,
    );
    this.chatGateway.emitToUser(
      req.user.userId,
      'newMessage',
      formattedMessage,
    );

    return formattedMessage;
  }

  @Patch('messages/read')
  async markMessagesAsRead(
    @Body() body: { partnerId: number },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.chatService.markMessagesAsRead(
      req.user.userId,
      body.partnerId,
    );
    if (result.count > 0) {
      this.chatGateway.emitToUser(body.partnerId, 'messagesRead', {
        readByUserId: req.user.userId,
        count: result.count,
      });
    }
    return result;
  }
}
