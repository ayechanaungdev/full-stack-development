import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeConnections = new Map<number, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly firebaseService: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader: string | string[] | undefined =
        client.handshake.headers.authorization ||
        (client.handshake.auth?.token as string | undefined) ||
        client.handshake.query?.token;

      if (!authHeader) {
        client.disconnect();
        return;
      }

      const token =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.replace('Bearer ', '')
          : Array.isArray(authHeader)
            ? authHeader[0]
            : authHeader;

      const payload: { sub: number; email: string; role: string } =
        await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'MY_SUPER_SECRET_KEY_123',
        });

      const socketData = client.data as {
        user: { userId: number; email: string; role: string };
      };
      socketData.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.activeConnections.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = (
      client.data as { user?: { userId: number; email: string; role: string } }
    ).user;
    if (user) {
      this.activeConnections.delete(user.userId);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { receiverId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = (
      client.data as { user?: { userId: number; email: string; role: string } }
    ).user;
    if (!sender) {
      throw new UnauthorizedException('Socket client not authenticated.');
    }

    const message = await this.chatService.saveMessage(
      sender.userId,
      data.receiverId,
      data.content,
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

    const receiverSocketId = this.activeConnections.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('newMessage', formattedMessage);
    }

    client.emit('newMessage', formattedMessage);

    const senderName =
      message.sender?.profile?.full_name || message.sender?.name || 'Someone';

    if (message.receiver?.profile?.expo_push_token) {
      console.log(
        `[ChatGateway] Sending push to receiver ${data.receiverId}: ${data.content.substring(0, 30)}`,
      );
      void this.firebaseService.sendPushNotification(
        message.receiver.profile.expo_push_token,
        senderName,
        data.content,
        {
          type: 'message',
          senderId: String(sender.userId),
          url: `carrentalv2://chat/${sender.userId}`,
        },
      );
    }

    await this.prisma.notification.create({
      data: {
        title: senderName,
        body: data.content,
        type: 'message',
        userId: data.receiverId,
        senderId: sender.userId,
        referenceId: String(sender.userId),
      },
    });

    return formattedMessage;
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { partnerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = (
      client.data as { user?: { userId: number; email: string; role: string } }
    ).user;
    if (!sender) return;

    const result = await this.chatService.markMessagesAsRead(
      sender.userId,
      data.partnerId,
    );

    const partnerSocketId = this.activeConnections.get(data.partnerId);
    if (partnerSocketId && result.count > 0) {
      this.server.to(partnerSocketId).emit('messagesRead', {
        readByUserId: sender.userId,
        count: result.count,
      });
    }

    return result;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { receiverId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = (
      client.data as { user?: { userId: number; email: string; role: string } }
    ).user;
    if (!sender) return;

    const receiverSocketId = this.activeConnections.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('typing', {
        userId: sender.userId,
        isTyping: data.isTyping,
      });
    }
  }

  isUserOnline(userId: number): boolean {
    return this.activeConnections.has(userId);
  }

  emitToUser(userId: number, event: string, data: any) {
    const socketId = this.activeConnections.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  emitToMultipleUsers(userIds: number[], event: string, data: any) {
    for (const userId of userIds) {
      const socketId = this.activeConnections.get(userId);
      if (socketId) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }
}
