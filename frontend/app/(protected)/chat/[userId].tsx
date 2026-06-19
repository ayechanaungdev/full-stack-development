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
import { supabase } from "@/lib/supabase";
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

  useEffect(() => {
    if (!otherUserId) return;
    const getPartner = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone, location, postal_code")
        .eq("id", otherUserId)
        .single();
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
    };
    getPartner();
  }, [otherUserId]);

  useEffect(() => {
    if (currentUser?.id && otherUserId) {
      const markConversationRead = async () => {
        const messageReadCount = await markAsRead(currentUser.id, otherUserId);

        const { data: updatedNotifications } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .select("id")
          .eq("receiver_id", currentUser.id)
          .eq("sender_id", otherUserId)
          .eq("type", "message")
          .eq("is_read", false);

        const notificationReadCount = updatedNotifications?.length ?? 0;

        if (notificationReadCount > 0 || messageReadCount > 0) {
          queryClient.setQueryData(
            ["badge-counts", currentUser.id],
            (oldData: any) => {
              if (!oldData) return oldData;
              return {
                ...oldData,
                notifications: Math.max(
                  0,
                  oldData.notifications - notificationReadCount,
                ),
                messages: Math.max(0, oldData.messages - messageReadCount),
              };
            },
          );
        }
      };

      setActivePartnerId(otherUserId);
      clearMessages();
      fetchMessages(currentUser.id, otherUserId);
      markConversationRead();
      const unsubscribe = subscribeToMessages(currentUser.id);
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
    if (!inputText.trim() || !currentUser?.id || !otherUserId) return;
    // 2. Check Network Connection
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      Alert.alert(
        "No Internet Connection",
        "Please check your network and try again.",
        [{ text: "OK" }],
      );
      // Return early WITHOUT clearing inputText
      return;
    }
    const content = inputText.trim();

    try {
      // Clear the input only AFTER confirming we are online
      setInputText("");
      await sendMessage(currentUser.id, otherUserId, content);
    } catch {
      // If the database insert fails (e.g., server down), put the text back
      setInputText(content);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
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
                  const isMine = item.sender_id === currentUser?.id;
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
                onChangeText={setInputText}
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
