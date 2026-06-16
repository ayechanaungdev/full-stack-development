import Toast from "@/components/Toast";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import { Modal, Pressable, TouchableWithoutFeedback } from "react-native";
import townships from "../constants/yangon-townships.json";
import { Box } from "./ui/box";
import { Card } from "./ui/card";
import { Image } from "./ui/image";

type ProfileDetailModalProps = {
  open: boolean;
  onClose: () => void;
  profile: {
    name?: string | null;
    phone?: string | null | undefined;
    avatarUrl?: string | null | undefined;
    location?: string | null | undefined;
    postal_code?: string | null | undefined;
  };
};

const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  open,
  onClose,
  profile,
}) => {
  const defaultUserImage = require("@/assets/images/avatar1.png");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const copyPhoneToClipboard = async (phone: string | null | undefined) => {
    if (!phone) return;

    await Clipboard.setStringAsync(phone);
    setToastMessage("Phone number copied to clipboard.");
    setToastVisible(true);
  };

  return (
    <Modal
      visible={open}
      onRequestClose={onClose}
      transparent
      animationType="fade"
    >
      <Pressable
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.8)",
        }}
        onPress={onClose}
      >
        <TouchableWithoutFeedback>
          <Card className="p-8 rounded-2xl bg-white shadow-sm w-11/12 max-w-md">
            {/* Close button at top-right */}
            <Pressable
              onPress={onClose}
              style={{ position: "absolute", top: 0, right: 12, zIndex: 10 }}
              hitSlop={12}
            >
              <Text className="text-4xl text-slate-400 font-bold">×</Text>
            </Pressable>
            <VStack style={{ alignItems: "center" }}>
              <Box className="rounded-full mb-4 border-4 border-[#16a8e3] p-1 bg-white">
                <Image
                  size="lg"
                  source={{
                    uri: profile.avatarUrl
                      ? profile.avatarUrl
                      : defaultUserImage,
                  }}
                  alt="Profile"
                  className="rounded-full"
                />
              </Box>
              <Text className="text-lg font-bold text-black">
                {profile.name}
              </Text>
            </VStack>
            {/* Phone Number */}
            <HStack
              className="items-center border-b border-slate-200 pb-6 py-5"
              space="4xl"
            >
              <Text className="text-slate-500 w-32">Mobile No</Text>
              <Text className="font-medium text-slate-800">
                {profile.phone}
              </Text>
              <Ionicons
                name="copy-outline"
                size={20}
                color="#16a8e3"
                onPress={() => copyPhoneToClipboard(profile.phone)}
              />
            </HStack>
            {/* Township */}
            <HStack
              className="items-center border-b border-slate-200 py-5"
              space="4xl"
            >
              <Text className="text-slate-500 w-32">Township </Text>
              <Text className="font-medium text-slate-800 flex-1">
                {profile.postal_code
                  ? townships.find((t) => t.postalCode === profile.postal_code)
                      ?.name || profile.postal_code
                  : "-"}{" "}
                Township
              </Text>
            </HStack>
            {/* Detail Address */}
            <HStack
              className="items-center border-b border-slate-200 py-5"
              space="4xl"
            >
              <Text className="text-slate-500 w-32">Detail Address </Text>
              <Text className="font-medium text-slate-800 flex-1">
                {profile.location}
              </Text>
            </HStack>
          </Card>
        </TouchableWithoutFeedback>
      </Pressable>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onClose={() => setToastVisible(false)}
      />
    </Modal>
  );
};

export default ProfileDetailModal;
