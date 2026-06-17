import { supabase } from "@/lib/supabase";
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
  // Clears the messages array so switching conversations never
  // shows a stale previous conversation's messages
  clearMessages: () => void;
  updateMessage: (message: Message) => void;
  clearConversations: () => void;
}

// Global variables to ensure only ONE realtime subscription is active
// across the entire app (preventing double message processing)
let activeChannel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
const processedMessageIds = new Set<string>();

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
    const { data: allMessages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error || !allMessages) {
      set({ isLoadingConversations: false });
      return;
    }

    const conversationMap = new Map<
      string,
      { lastMsg: Message; unreadCount: number }
    >();
    for (const msg of allMessages) {
      const partnerId =
        msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, { lastMsg: msg, unreadCount: 0 });
      }
      if (msg.sender_id === partnerId && !msg.is_read) {
        conversationMap.get(partnerId)!.unreadCount++;
      }
    }

    const partnerIds = Array.from(conversationMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", partnerIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const conversations: Conversation[] = partnerIds.map((partnerId) => {
      const entry = conversationMap.get(partnerId)!;
      const profile = profileMap.get(partnerId);
      return {
        partner_id: partnerId,
        partner_name: profile?.full_name || "Unknown User",
        partner_avatar: profile?.avatar_url || null,
        last_message: entry.lastMsg.content,
        last_message_at: entry.lastMsg.created_at,
        unread_count: entry.unreadCount,
      };
    });

    set({ conversations, isLoadingConversations: false });
  },

  fetchMessages: async (userId: string, partnerId: string) => {
    set({ isLoadingMessages: true });
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true });
    set({ messages: data || [], isLoadingMessages: false });
  },

  sendMessage: async (
    senderId: string,
    receiverId: string,
    content: string,
  ) => {
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: senderId, receiver_id: receiverId, content })
      .select()
      .single();
    if (error) {
      return;
    }
    if (data) {
      set((state) => {
        const newConvs = [...state.conversations];
        const idx = newConvs.findIndex((c) => c.partner_id === receiverId);
        if (idx >= 0) {
          newConvs[idx] = {
            ...newConvs[idx],
            last_message: content,
            last_message_at: data.created_at,
          };
          const updatedConv = newConvs.splice(idx, 1)[0];
          newConvs.unshift(updatedConv);
        } else {
          get().fetchConversations(senderId);
        }

        return {
          messages: [...state.messages, data],
          conversations: idx >= 0 ? newConvs : state.conversations,
        };
      });
    }
  },

  markAsRead: async (userId: string, partnerId: string) => {
    const { data } = await supabase
      .from("messages")
      .update({ is_read: true })
      .select("id")
      .eq("sender_id", partnerId)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    const readCount = data?.length ?? 0;

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
  },

  subscribeToMessages: (userId: string) => {
    subscriberCount++;
    if (!activeChannel) {
      const channelName = `messages-realtime-${userId}`;
      activeChannel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => get().addIncomingMessage(payload.new as Message),
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `sender_id=eq.${userId}`,
          },
          (payload) => get().updateMessage(payload.new as Message),
        )
        .subscribe();
    }

    return () => {
      subscriberCount--;
      if (subscriberCount <= 0 && activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
        subscriberCount = 0;
      }
    };
  },

  addIncomingMessage: (message: Message) => {
    if (processedMessageIds.has(message.id)) return;
    processedMessageIds.add(message.id);
    if (processedMessageIds.size > 500) {
      const iterator = processedMessageIds.values();
      processedMessageIds.delete(iterator.next().value!); // keep set strictly bounded
    }

    set((state) => {
      // Check if message already exists
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state; // skip duplicates

      // Only append if we are currently chatting with the sender
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
        conversations: convIndex >= 0 ? newConvs : state.conversations
      };
    });

    const state = get();
    const currentUserId = useAuthStore.getState().user?.id;
    const isViewingPartner = state.activePartnerId === message.sender_id;

    if (!isViewingPartner && currentUserId && currentUserId === message.receiver_id) {
      adjustBadgeCount(currentUserId, 'messages', 1);
    }

    // If the message is from the partner we are currently viewing, mark it as read!
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
