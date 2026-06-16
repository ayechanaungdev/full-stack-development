import EmptyState from "@/components/EmptyState";
import { Box } from "@/components/ui/box";
import { SearchIcon } from "@/components/ui/icon";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import Entypo from "@expo/vector-icons/Entypo";
import { useRouter } from "expo-router";
import { MessageSquareOff } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SectionList,
  Text,
  View,
} from "react-native";

type Conversation = {
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

// Groups conversations into Today / Yesterday / This Week / Earlier
function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - 6);

  const groups: { [key: string]: Conversation[] } = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  for (const conv of conversations) {
    const date = new Date(conv.last_message_at);
    if (date >= startOfToday) {
      groups["Today"].push(conv);
    } else if (date >= startOfYesterday) {
      groups["Yesterday"].push(conv);
    } else if (date >= startOfThisWeek) {
      groups["This Week"].push(conv);
    } else {
      groups["Earlier"].push(conv);
    }
  }

  return ["Today", "Yesterday", "This Week", "Earlier"]
    .filter((title) => groups[title].length > 0)
    .map((title) => ({ title, data: groups[title] }));
}

// Format time as "08:45 AM"
function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    conversations,
    isLoadingConversations,
    fetchConversations,
    subscribeToMessages,
    clearConversations,
  } = useChatStore();

  useEffect(() => {
    if (!user?.id) return;

    fetchConversations(user.id);
    const unsubscribe = subscribeToMessages(user.id);

    return () => {
      unsubscribe();
      clearConversations();
    };
  }, [user?.id]);
  const onRefresh = useCallback(() => {
    if (user?.id) fetchConversations(user.id);
  }, [user?.id]);



  const [searchQuery, setSearchQuery] = useState("");
  const filteredConversations = conversations.filter((conv) => {
    return conv.partner_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sections = groupConversations(filteredConversations);

  const renderItem = ({ item }: { item: Conversation }) => (
    <Pressable
      className="flex-row items-center px-4 py-3 bg-brand-0"
      onPress={() => router.push(`/(protected)/chat/${item.partner_id}` as any)}
    >
      {/* Avatar */}
      {item.partner_avatar ? (
        <Image
          source={{ uri: item.partner_avatar }}
          className="w-12 h-12 rounded-full"
        />
      ) : (
        <Image
          source={require("@/assets/images/avatar1.png")}
          className="w-12 h-12 rounded-full border-2 border-brand-500"
        />
      )}

      {/* Name + Last message */}
      <View className="flex-1 ml-3">
        <View className="flex-row justify-between items-center">
          <Text
            className="text-base font-semibold text-gray-900 flex-1 mr-2"
            numberOfLines={1}
          >
            {item.partner_name}
          </Text>
          <Text
            className={`text-xs font-medium ${item.unread_count > 0 ? "text-brand-700" : "text-gray-500"}`}
          >
            {formatTime(item.last_message_at)}
          </Text>
        </View>
        <View className="flex-row justify-between items-center mt-0.5">
          <Text
            className={`text-sm flex-1 mr-2 ${item.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}
            numberOfLines={2}
          >
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View className="bg-brand-700 rounded-full min-w-[20px] h-5 justify-center items-center px-1">
              <Text className="text-white text-[10px] font-bold">
                {item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View className="px-4 py-1.5 bg-brand-200">
      <Text className="text-xs font-semibold text-brand-925 uppercase tracking-wide">
        {section.title}
      </Text>
    </View>
  );

  if (isLoadingConversations && conversations.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-0">

      <Box className="px-4 pt-4 pb-2 mt-1 mb-4">
        <Input className="bg-white rounded-xl px-3 h-11">
          <InputField
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="text-sm"
            maxLength={30}
          />
          <InputSlot>
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                <Entypo name="cross" size={18} color="#9CA3AF" />
              </Pressable>
            ) : (
              <SearchIcon
                className="text-gray-400"
                width={14}
                height={14}
                fill="white"
                stroke="#9CA3AF"
              />
            )}
          </InputSlot>
        </Input>
      </Box>
      {conversations.length === 0 ? (
        <EmptyState icon={MessageSquareOff} message="No messages yet" />
      ) : filteredConversations.length === 0 ? (
        <EmptyState icon={MessageSquareOff} message="No matching conversations" />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.partner_id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          onRefresh={onRefresh}
          refreshing={isLoadingConversations}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-100 ml-[76px]" />
          )}
        />
      )}
    </View>
  );
}