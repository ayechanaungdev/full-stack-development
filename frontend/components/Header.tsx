import { SearchWithRings } from "@/components/SearchWithRings";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import tailwindConfig from "@/tailwind.config";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, ReceiptText } from "lucide-react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import resolveConfig from "tailwindcss/resolveConfig";
import { Box } from "./ui/box";
import { VStack } from "./ui/vstack";

interface Props {
  avatarUrl: string | null;
  title: string;
  isOwner: boolean;
  onBell: () => void;
  onAvatarPress?: () => void;
  centerTitle?: boolean;
  notificationCount?: number;
  reportcount?: number;
}

const fullConfig = resolveConfig(tailwindConfig) as any;
const brand = fullConfig.theme.colors.brand;
const CARD_SHADOW = {
  shadowColor: brand[975],
  shadowOffset: { width: 20, height: 20 },
  shadowOpacity: 1,
  shadowRadius: 100,
  elevation: 30,
};
export function Header({
  avatarUrl,
  title,
  isOwner,
  onBell,
  onAvatarPress,
  notificationCount = 0,
  reportcount = 0,
  centerTitle = false,
}: Props) {
  const islongName = title.length > 25;
  return (
    <LinearGradient
      colors={["#c4ecfb", "#e1f6fd", "#f0fafe"]}
      locations={[0, 0.5, 1]}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 50,
      }}
    >
      <SafeAreaView edges={["top"]}>
        <HStack className="items-center justify-between px-5 h-16 ">
          <HStack className="items-center gap-3">
            <Pressable onPress={onAvatarPress}>
              <Avatar size="md" className={"border-2 border-brand-500"}>
                {avatarUrl ? (
                  <AvatarImage source={{ uri: avatarUrl }} alt="avatar" />
                ) : (
                  <AvatarImage
                    source={require("@/assets/images/avatar1.png")}
                    alt="avatar"
                    className="rounded-full"
                  />
                )}
              </Avatar>
            </Pressable>

            {!centerTitle && (
              <Heading
                size={islongName ? "md" : "lg"}
                className="font-extrabold text-gray-900"
              >
                {title}
              </Heading>
            )}
          </HStack>

          {centerTitle && (
            <HStack
              className="absolute left-1 right-14 items-center justify-center -z-10"
              pointerEvents="none"
            >
              <Heading
                className="text-brand-700"
                style={{ fontSize: 20, fontWeight: "bold" }}
              >
                {title}
              </Heading>
            </HStack>
          )}

          <HStack className="items-center gap-4">
            {isOwner ? (
              <Pressable
                onPress={() => router.push("/reports")}
                className="active:opacity-60"
              >
                <Box
                  className="w-12 h-12 bg-brand-700 rounded-2xl items-center justify-center"
                  style={CARD_SHADOW}
                >
                  <VStack>
                    <Icon as={ReceiptText} size="2xl" className="text-white" />
                    {reportcount > 0 && (
                      <HStack
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full items-center justify-center border-2 border-white"
                        style={{ width: 20, height: 20 }}
                      >
                        <Heading className="text-white text-[10px] font-bold">
                          {Number(reportcount) > 9 ? "9+" : reportcount}
                        </Heading>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/search")}
                className="active:opacity-60"
              >
                <Box className="w-12 h-12 rounded-full items-center justify-center bg-transparent">
                  <SearchWithRings />
                </Box>
              </Pressable>
            )}
            <Pressable onPress={onBell} className="active:opacity-60">
              <Icon as={Bell} size="2xl" className="text-sky-500 mx-2" />
              {notificationCount > 0 && (
                <HStack
                  className="absolute -top-2 -right-0 bg-red-500 rounded-full items-center justify-center border-2 border-white"
                  style={{ width: 20, height: 20 }}
                >
                  <Heading className="text-white text-[10px] font-bold">
                    {Number(notificationCount) > 9 ? "9+" : notificationCount}
                  </Heading>
                </HStack>
              )}
            </Pressable>
          </HStack>
        </HStack>
      </SafeAreaView>
    </LinearGradient>
  );
}
