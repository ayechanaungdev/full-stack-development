import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService) { }

    async saveMessage(senderId: number, receiverId: number, content: string) {
        return this.prisma.message.create({
            data: {
                content,
                senderId,
                receiverId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        profile: { select: { avatar_url: true, full_name: true } },
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        profile: { select: { avatar_url: true, full_name: true, expo_push_token: true } },
                    },
                },
            },
        });
    }

    async getChatHistory(userId1: number, userId2: number) {
        return this.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId1, receiverId: userId2 },
                    { senderId: userId2, receiverId: userId1 },
                ],
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        profile: { select: { avatar_url: true, full_name: true } },
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        profile: { select: { avatar_url: true, full_name: true } },
                    },
                },
            },
        });
    }

    async getConversations(userId: number) {
        // Get all messages involving this user, grouped by partner
        const messages = await this.prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatar_url: true, full_name: true } },
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        profile: { select: { avatar_url: true, full_name: true } },
                    },
                },
            },
        });

        const conversationMap = new Map<number, {
            lastMessage: typeof messages[0];
            unreadCount: number;
        }>();

        for (const msg of messages) {
            const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
            if (!conversationMap.has(partnerId)) {
                conversationMap.set(partnerId, { lastMessage: msg, unreadCount: 0 });
            }
            if (msg.senderId === partnerId && !msg.isRead) {
                conversationMap.get(partnerId)!.unreadCount++;
            }
        }

        const conversations = Array.from(conversationMap.entries()).map(([partnerId, entry]) => {
            const partner = entry.lastMessage.senderId === userId
                ? entry.lastMessage.receiver
                : entry.lastMessage.sender;
            return {
                partnerId,
                partnerName: partner.profile?.full_name || partner.name || 'Unknown User',
                partnerAvatar: partner.profile?.avatar_url || null,
                lastMessage: entry.lastMessage.content,
                lastMessageAt: entry.lastMessage.createdAt,
                unreadCount: entry.unreadCount,
            };
        });

        return conversations;
    }

    async markMessagesAsRead(currentUserId: number, partnerId: number) {
        const result = await this.prisma.message.updateMany({
            where: {
                senderId: partnerId,
                receiverId: currentUserId,
                isRead: false,
            },
            data: { isRead: true },
        });
        return { count: result.count };
    }
}
