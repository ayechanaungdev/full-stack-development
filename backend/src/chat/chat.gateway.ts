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
import { UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    // Track online users: Map<userId (number), socketId (string)>
    private activeConnections = new Map<number, string>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly chatService: ChatService,
    ) { }

    // Authenticate user on socket connection
    async handleConnection(client: Socket) {
        try {
            const authHeader =
                client.handshake.headers.authorization ||
                client.handshake.auth?.token ||
                client.handshake.query?.token;

            if (!authHeader) {
                console.log('WebSocket Connection Rejected: No authentication token found.');
                client.disconnect();
                return;
            }

            // Handle both raw token or 'Bearer <token>' format
            const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                ? authHeader.replace('Bearer ', '')
                : authHeader;

            // Verify and decode JWT token (secret matches Day 6 configuration)
            const payload = await this.jwtService.verifyAsync(token, {
                secret: 'MY_SUPER_SECRET_KEY_123',
            });

            // Save user details to socket data object
            client.data.user = {
                userId: payload.sub,
                email: payload.email,
                role: payload.role,
            };

            // Store in our active connections tracker
            this.activeConnections.set(payload.sub, client.id);
            console.log(`WebSocket Connected: ${payload.email} (${client.id})`);
        } catch (err) {
            console.log('WebSocket Connection Rejected: Invalid token.', err.message);
            client.disconnect();
        }
    }

    // Clean up on client disconnect
    handleDisconnect(client: Socket) {
        if (client.data.user) {
            this.activeConnections.delete(client.data.user.userId);
            console.log(`WebSocket Disconnected: ${client.data.user.email}`);
        }
    }

    // Listen for the "sendMessage" event from client
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() data: { receiverId: number; content: string },
        @ConnectedSocket() client: Socket,
    ) {
        const sender = client.data.user;
        if (!sender) {
            throw new UnauthorizedException('Socket client not authenticated.');
        }

        // 1. Save message to PostgreSQL DB
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
            sender: {
                id: message.sender.id,
                email: message.sender.email,
                name: message.sender.name,
            },
        };

        // 2. Deliver message to receiver if they are online
        const receiverSocketId = this.activeConnections.get(data.receiverId);
        if (receiverSocketId) {
            this.server.to(receiverSocketId).emit('newMessage', formattedMessage);
        }

        // 3. Send message back to sender's own app instance as confirmation
        client.emit('newMessage', formattedMessage);

        return formattedMessage;
    }
}
