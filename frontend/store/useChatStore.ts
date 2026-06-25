import { apiClient } from "@/lib/axios";
import { socketService } from "@/lib/socket";
import { useAuthStore } from "@/store/useAuthStore";
import { adjustBadgeCount } from "@/store/useBadgeStore";
import { create } from "zustand";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface ChatState {
  activePartnerId: string | null;
  setActivePartnerId: (partnerId: string | null) => void;
  conversations: Conversation[];
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingUsers: Set<string>;
  fetchConversations: (userId?: string) => Promise<void>;
  fetchMessages: (userId: string, partnerId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  markAsRead: (partnerId: string) => Promise<number>;
  subscribeToMessages: () => () => void;
  addIncomingMessage: (message: Message) => void;
  clearMessages: () => void;
  clearConversations: () => void;
  emitTyping: (receiverId: string, isTyping: boolean) => void;
}

let newMessageHandler: ((message: any) => void) | null = null;
let messagesReadHandler: ((data: any) => void) | null = null;
let typingHandler: ((data: any) => void) | null = null;
const processedMessageIds = new Set<string>();

const mapApiMessage = (msg: any): Message => ({
  id: String(msg.id),
  sender_id: String(msg.senderId),
  receiver_id: String(msg.receiverId),
  content: msg.content,
  is_read: msg.isRead ?? false,
  created_at: msg.createdAt ?? msg.created_at,
});

const mapApiConversation = (conv: any): Conversation => ({
  partner_id: String(conv.partnerId),
  partner_name: conv.partnerName,
  partner_avatar: conv.partnerAvatar,
  last_message: conv.lastMessage,
  last_message_at: conv.lastMessageAt,
  unread_count: conv.unreadCount,
});

export const useChatStore = create<ChatState>((set, get) => ({
  activePartnerId: null,
  setActivePartnerId: (partnerId) => set({ activePartnerId: partnerId }),
  conversations: [],
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingUsers: new Set<string>(),

  clearMessages: () => set({ messages: [] }),

  clearConversations: () => set({ conversations: [], isLoadingConversations: false }),

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const response = await apiClient.get('/chat/conversations');
      set({ conversations: (response.data ?? []).map(mapApiConversation), isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (userId: string, partnerId: string) => {
    set({ isLoadingMessages: true });
    try {
      const response = await apiClient.get(`/chat/history/${Number(partnerId)}`);
      set({ messages: (response.data ?? []).map(mapApiMessage), isLoadingMessages: false });
    } catch {
      set({ messages: [], isLoadingMessages: false });
    }
  },

  sendMessage: async (receiverId: string, content: string) => {
    socketService.emit('sendMessage', {
      receiverId: Number(receiverId),
      content,
    });
  },

  markAsRead: async (partnerId: string) => {
    try {
      const response = await apiClient.patch('/chat/messages/read', {
        partnerId: Number(partnerId),
      });
      const readCount = response.data?.count ?? 0;
      if (readCount > 0) {
        const uid = String(useAuthStore.getState().user?.id);
        adjustBadgeCount(uid, 'messages', -readCount);
      }
      set((state) => {
        const newConvs = [...state.conversations];
        const idx = newConvs.findIndex((c) => c.partner_id === partnerId);
        if (idx >= 0) newConvs[idx] = { ...newConvs[idx], unread_count: 0 };
        return { conversations: newConvs };
      });
      return readCount;
    } catch {
      return 0;
    }
  },

  subscribeToMessages: () => {
    if (newMessageHandler) return () => {};

    newMessageHandler = (message: any) => {
      get().addIncomingMessage(mapApiMessage(message));
    };

    messagesReadHandler = (data: { readByUserId: number }) => {
      const readBy = String(data.readByUserId);
      set((state) => ({
        messages: state.messages.map((m) =>
          String(m.receiver_id) === readBy ? { ...m, is_read: true } : m
        ),
      }));
    };

    typingHandler = (data: { userId: number; isTyping: boolean }) => {
      const pId = String(data.userId);
      set((state) => {
        const next = new Set(state.typingUsers);
        data.isTyping ? next.add(pId) : next.delete(pId);
        return { typingUsers: next };
      });
    };

    socketService.on('newMessage', newMessageHandler);
    socketService.on('messagesRead', messagesReadHandler);
    socketService.on('typing', typingHandler);

    return () => {
      if (newMessageHandler) {
        socketService.off('newMessage', newMessageHandler);
        socketService.off('messagesRead', messagesReadHandler);
        socketService.off('typing', typingHandler);
        newMessageHandler = null;
        messagesReadHandler = null;
        typingHandler = null;
      }
      set({ typingUsers: new Set() });
    };
  },

  addIncomingMessage: (message: Message) => {
    if (processedMessageIds.has(message.id)) return;
    processedMessageIds.add(message.id);
    if (processedMessageIds.size > 500) {
      const it = processedMessageIds.values();
      processedMessageIds.delete(it.next().value!);
    }

    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;

      const inCurrent = state.activePartnerId === message.sender_id || state.activePartnerId === message.receiver_id;
      let newConvs = [...state.conversations];
      const currentUserId = String(useAuthStore.getState().user?.id ?? '');
      const isOwnMessage = currentUserId === message.sender_id;
      const pId = isOwnMessage ? message.receiver_id : message.sender_id;
      const convIndex = newConvs.findIndex(c => c.partner_id === pId);
      const isViewingPartner = state.activePartnerId === pId;

      if (convIndex >= 0) {
        newConvs[convIndex] = {
          ...newConvs[convIndex],
          last_message: message.content,
          last_message_at: message.created_at,
          unread_count: isViewingPartner ? 0 : newConvs[convIndex].unread_count + 1,
        };
        const updatedConv = newConvs.splice(convIndex, 1)[0];
        newConvs.unshift(updatedConv);
      }

      return {
        messages: inCurrent ? [...state.messages, message] : state.messages,
        conversations: convIndex >= 0 ? newConvs : state.conversations,
      };
    });

    const state = get();
    const currentUserId = useAuthStore.getState().user?.id;
    const isOwnMessage = currentUserId && String(currentUserId) === message.sender_id;
    const partnerId = isOwnMessage ? message.receiver_id : message.sender_id;
    const isViewingPartner = state.activePartnerId === partnerId;

    if (!isViewingPartner && currentUserId && !isOwnMessage) {
      adjustBadgeCount(String(currentUserId), 'messages', 1);
    }

    if (state.activePartnerId === partnerId) {
      get().markAsRead(partnerId);
    }
  },

  emitTyping: (receiverId: string, isTyping: boolean) => {
    socketService.emit('typing', { receiverId: Number(receiverId), isTyping });
  },
}));
