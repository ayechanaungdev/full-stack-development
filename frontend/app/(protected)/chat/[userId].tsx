import { BackButton } from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import ProfileDetailModal from "@/components/ProfileDetailModal";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Input, InputField } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import NetInfo from "@react-native-community/netinfo";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import {
  Check,
  CheckCheck,
  MessageCircleDashed,
  Send,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, Platform, Pressable } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDateSeparator = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  }
};

export default function ChatScreen() {
  const headerHeight = useHeaderHeight();
  const { userId: otherUserId } = useLocalSearchParams<{ userId: string }>();
  // OLD: const { session } = useAuthStore(); — session.user.id for chat
  // NEW: use user from store (backend auth stores user separately)
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const {
    messages,
    isLoadingMessages,
    fetchMessages,
    sendMessage,
    markAsRead,
    subscribeToMessages,
    clearMessages,
    setActivePartnerId,
    typingUsers,
    emitTyping,
  } = useChatStore();
  const [inputText, setInputText] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    location: "",
    postal_code: "",
    avatarUrl: "",
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partnerTyping = otherUserId ? typingUsers.has(otherUserId) : false;

  useEffect(() => {
    if (!otherUserId) return;
    const getPartner = async () => {
      try {
        const response = await apiClient.get(`/users/${Number(otherUserId)}`);
        const data = response.data;
        if (data?.full_name) setPartnerName(data.full_name);
        if (data?.avatar_url) setPartnerAvatar(data.avatar_url);
        if (data) {
          setProfile({
            name: data.full_name ?? "",
            phone: data.phone ?? "",
            location: data.location ?? "",
            postal_code: data.postal_code ?? "",
            avatarUrl: data.avatar_url ?? "",
          });
        }
      } catch {}
    };
    getPartner();
  }, [otherUserId]);

  useEffect(() => {
    if (currentUser?.id && otherUserId) {
      const markConversationRead = async () => {
        const messageReadCount = await markAsRead(otherUserId);

        let notificationReadCount = 0;
        try {
          const notiResponse = await apiClient.patch('/notifications/read-by-sender', {
            senderId: Number(otherUserId),
            type: 'message',
          });
          notificationReadCount = notiResponse.data?.count ?? 0;
        } catch {} 

        if (notificationReadCount > 0 || messageReadCount > 0) {
          queryClient.setQueryData(
            ["badge-counts", currentUser.id],
            (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                notifications: Math.max(0, oldData.notifications - notificationReadCount),
                messages: Math.max(0, oldData.messages - messageReadCount),
              };
            },
          );
        }
      };

      setActivePartnerId(otherUserId);
      clearMessages();
      fetchMessages(String(currentUser.id), otherUserId);
      markConversationRead();
      const unsubscribe = subscribeToMessages();
      return () => {
        unsubscribe();
        clearMessages();
        setActivePartnerId(null);
      };
    }
  }, [
    currentUser?.id,
    otherUserId,
    fetchMessages,
    markAsRead,
    queryClient,
    setActivePartnerId,
    subscribeToMessages,
    clearMessages,
  ]);

  const reversedMessages = React.useMemo(
    () => [...messages].reverse(),
    [messages],
  );

  const handleSend = async () => {
    if (!inputText.trim() || !otherUserId) return;
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      Alert.alert("No Internet Connection", "Please check your network and try again.", [{ text: "OK" }]);
      return;
    }
    const content = inputText.trim();
    setInputText("");
    sendMessage(otherUserId, content);
  };

  return (
    <>
      <SafeAreaView
        className="flex-1 bg-brand-0 dark:bg-black"
        edges={["top", "bottom"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
        >
          {/* ── Header ── */}
          <HStack className="px-3 py-2 items-center justify-between border-b border-outline-100 bg-brand-0 dark:bg-black">
            {/* Back button */}
            <BackButton />

            {/* Partner name */}
            {/* <Heading size="md" className="text-brand-700 font-semibold">
              {partnerName}
            </Heading> */}
            <Box className="flex-1 px-2 items-center">
              <Heading
                size="md"
                className="text-brand-700 font-semibold"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {partnerName}
              </Heading>
            </Box>

            {/* Partner avatar (right side) */}
            <Pressable onPress={() => setProfileModalOpen(true)}>
              {partnerAvatar ? (
                <Image
                  source={{ uri: partnerAvatar }}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <Image
                  source={require("@/assets/images/avatar1.png")}
                  className="w-12 h-12 rounded-full border-2 border-brand-500"
                />
              )}
            </Pressable>
          </HStack>

          {/* ── Messages ── */}
          <Box className="flex-1 bg-brand-0 dark:bg-black">
            {isLoadingMessages && messages.length === 0 ? (
              <Center className="flex-1">
                <Spinner />
              </Center>
            ) : messages.length === 0 ? (
                <Center className="flex-1 -mt-16">
                  <EmptyState
                    icon={MessageCircleDashed}
                    message="Start a conversation"
                  />
                </Center>
            ) : (
              <FlatList
                ref={flatListRef}
                showsVerticalScrollIndicator={false}
                data={reversedMessages}
                inverted
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => {
                  const isMine = item.sender_id === String(currentUser?.id);
                  const showDateSeparator =
                    index === reversedMessages.length - 1 ||
                    new Date(
                      reversedMessages[index + 1].created_at,
                    ).toDateString() !==
                      new Date(item.created_at).toDateString();

                  return (
                    <Box className="w-full">
                      {showDateSeparator && (
                        <Center className="my-4">
                          <Box className="bg-background-100 dark:bg-background-800 px-3 py-1 rounded-full">
                            <Text
                              size="xs"
                              className="text-typography-500 font-medium"
                            >
                              {formatDateSeparator(item.created_at)}
                            </Text>
                          </Box>
                        </Center>
                      )}
                      <VStack
                        className={`mb-3 max-w-[75%] ${
                          isMine
                            ? "self-end items-end"
                            : "self-start items-start"
                        }`}
                      >
                        <Box
                          className={`px-4 py-3 rounded-2xl ${
                            isMine
                              ? "bg-brand-700 rounded-br-sm"
                              : "bg-background-100 rounded-bl-sm"
                          }`}
                        >
                          <Text
                            className={
                              isMine
                                ? "text-white font-medium text-base"
                                : "text-typography-900 font-medium text-base"
                            }
                          >
                            {item.content}
                          </Text>
                        </Box>
                        <HStack space="xs" className="mt-1 items-center">
                          <Text size="xs" className="text-typography-400">
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                          {isMine &&
                            (item.is_read ? (
                              <Icon
                                as={CheckCheck}
                                size="sm"
                                className="text-brand-700"
                              />
                            ) : (
                              <Icon
                                as={Check}
                                size="sm"
                                className="text-brand-700"
                              />
                            ))}
                        </HStack>
                      </VStack>
                    </Box>
                  );
                }}
              />
            )}
          </Box>

          {/* ── Typing indicator ── */}
          {partnerTyping && (
            <Box className="px-4 py-1">
              <Text size="xs" className="text-typography-400 italic">
                {partnerName || "User"} is typing...
              </Text>
            </Box>
          )}

          {/* ── Input bar ── */}
          <HStack
            space="sm"
            className="px-4 py-3 items-center border-t border-outline-100 bg-brand-0 dark:bg-black"
          >
            <Input
              className="flex-1 rounded-full bg-white border border-outline-200"
              size="md"
            >
              <InputField
                placeholder="Type a message ..."
                placeholderTextColor="#aaa"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (!otherUserId) return;
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                  emitTyping(otherUserId, text.length > 0);
                  typingTimerRef.current = setTimeout(() => {
                    emitTyping(otherUserId, false);
                  }, 2000);
                }}
                multiline
                onSubmitEditing={handleSend}
                returnKeyType="send"
                maxLength={500}
              />
            </Input>
            <Button
              size="md"
              variant="solid"
              action="primary"
              className={`rounded-full w-11 h-11 p-0 border-0 items-center justify-center ${
                !inputText.trim() ? "bg-gray-300 opacity-50" : "bg-brand-700"
              }`}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <ButtonIcon as={Send} className="text-white" />
            </Button>
          </HStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <ProfileDetailModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={{
          name: profile?.name ?? "",
          phone: profile?.phone ?? "",
          avatarUrl: profile?.avatarUrl ?? "",
          location: profile?.location ?? "",
          postal_code: profile?.postal_code ?? "",
        }}
      />
    </>
  );
}
