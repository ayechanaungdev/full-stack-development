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
  fetchConversations: (userId: string) => Promise<void>;
  fetchMessages: (userId: string, partnerId: string) => Promise<void>;
  sendMessage: (
    senderId: string,
    receiverId: string,
    content: string,
  ) => Promise<void>;
  markAsRead: (userId: string, partnerId: string) => Promise<number>;
  subscribeToMessages: (userId: string) => () => void;
  addIncomingMessage: (message: Message) => void;
  clearMessages: () => void;
  updateMessage: (message: Message) => void;
  clearConversations: () => void;
}

let subscriberCount = 0;
let newMessageHandler: ((message: any) => void) | null = null;
const processedMessageIds = new Set<string>();

const mapApiMessage = (msg: any): Message => ({
  id: String(msg.id),
  sender_id: String(msg.senderId),
  receiver_id: String(msg.receiverId),
  content: msg.content,
  is_read: msg.isRead ?? msg.is_read ?? false,
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

  clearMessages: () => set({ messages: [] }),

  clearConversations: () => set({ conversations: [], isLoadingConversations: false }),

  fetchConversations: async (userId: string) => {
    set({ isLoadingConversations: true });
    try {
      const response = await apiClient.get('/chat/conversations');
      const data = response.data ?? [];
      set({ conversations: data.map(mapApiConversation), isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (userId: string, partnerId: string) => {
    set({ isLoadingMessages: true });
    try {
      const response = await apiClient.get(`/chat/history/${Number(partnerId)}`);
      const data = response.data ?? [];
      set({ messages: data.map(mapApiMessage), isLoadingMessages: false });
    } catch {
      set({ messages: [], isLoadingMessages: false });
    }
  },

  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string,
  ) => {
    socketService.emit('sendMessage', {
      receiverId: Number(receiverId),
      content,
    });
  },

  markAsRead: async (userId: string, partnerId: string) => {
    try {
      const response = await apiClient.patch('/chat/messages/read', {
        partnerId: Number(partnerId),
      });
      const readCount = response.data?.count ?? 0;

      if (readCount > 0) {
        adjustBadgeCount(userId, 'messages', -readCount);
      }

      set((state) => {
        const newConvs = [...state.conversations];
        const idx = newConvs.findIndex((c) => c.partner_id === partnerId);
        if (idx >= 0) {
          newConvs[idx] = { ...newConvs[idx], unread_count: 0 };
        }
        return { conversations: newConvs };
      });

      return readCount;
    } catch {
      return 0;
    }
  },

  subscribeToMessages: (userId: string) => {
    subscriberCount++;

    if (subscriberCount === 1) {
      newMessageHandler = (message: any) => {
        get().addIncomingMessage(mapApiMessage(message));
      };
      socketService.on('newMessage', newMessageHandler);
    }

    return () => {
      subscriberCount--;
      if (subscriberCount <= 0) {
        if (newMessageHandler) {
          socketService.off('newMessage', newMessageHandler);
          newMessageHandler = null;
        }
        subscriberCount = 0;
      }
    };
  },

  addIncomingMessage: (message: Message) => {
    if (processedMessageIds.has(message.id)) return;
    processedMessageIds.add(message.id);
    if (processedMessageIds.size > 500) {
      const iterator = processedMessageIds.values();
      processedMessageIds.delete(iterator.next().value!);
    }

    set((state) => {
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;

      const inCurrent = state.activePartnerId === message.sender_id || state.activePartnerId === message.receiver_id;

      let newConvs = [...state.conversations];
      const pId = message.sender_id;
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
      } else {
        get().fetchConversations(message.receiver_id);
      }

      return {
        messages: inCurrent ? [...state.messages, message] : state.messages,
        conversations: convIndex >= 0 ? newConvs : state.conversations,
      };
    });

    const state = get();
    const currentUserId = useAuthStore.getState().user?.id;
    const isViewingPartner = state.activePartnerId === message.sender_id;

    if (!isViewingPartner && currentUserId && String(currentUserId) === message.receiver_id) {
      adjustBadgeCount(String(currentUserId), 'messages', 1);
    }

    if (state.activePartnerId === message.sender_id) {
      state.markAsRead(message.receiver_id, message.sender_id);
    }
  },

  updateMessage: (updatedMessage: Message) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === updatedMessage.id ? updatedMessage : m
      ),
    }));
  },
}));
