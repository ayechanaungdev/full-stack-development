import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Copy, Headphones, Mail, Phone, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

/* ---------------- COPY ROW ---------------- */

interface CopyableRowProps {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  onCopy: (val: string, label: string) => void;
}

const CopyableRow = ({ label, value, icon: Icon, onCopy }: CopyableRowProps) => {
  return (
    <Box
      className="flex-row items-center justify-between p-4 bg-[#f8fafc] rounded-2xl"
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#e2e8f0",
      }}
    >
      <HStack className="items-center flex-1">
        <Box className="bg-[#f0f9ff] p-2.5 rounded-xl mr-4">
          <Icon size={20} color="#00a8e3" />
        </Box>

        <VStack className="flex-1">
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
            {label}
          </Text>
          <Text selectable className="text-sm font-semibold text-slate-800">
            {value}
          </Text>
        </VStack>
      </HStack>

      <Pressable
        onPress={() => onCopy(value, label)}
        className="p-2 bg-white rounded-xl active:bg-slate-100 border border-slate-100"
        hitSlop={8}
      >
        <Copy size={16} color="#64748b" />
      </Pressable>
    </Box>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */

interface ContactAdminCardProps {
  visible: boolean;
  onClose: () => void;
}

export default function ContactAdminCard({
  visible,
  onClose,
}: ContactAdminCardProps) {
  const insets = useSafeAreaInsets();

  const [render, setRender] = useState(visible);
  const [animating, setAnimating] = useState(false);

  const translateY = useRef(new Animated.Value(600)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  /* Reset toast when closed */
  useEffect(() => {
    if (!render) {
      setToastVisible(false);
      setToastMessage("");
    }
  }, [render]);

  useEffect(() => {
    if (visible) {
      setRender(true);
      setAnimating(true);

      // Reset instantly to prevent flicker
      translateY.setValue(600);
      overlayOpacity.setValue(0);

      requestAnimationFrame(() => {
        // Stage 1: overlay fades in → pause → Stage 2: sheet slides up
        Animated.sequence([
          Animated.timing(overlayOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setAnimating(false);
        });
      });
    } else if (render) {
      setAnimating(true);

      // Stage 1: sheet slides down, then Stage 2: overlay fades out
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimating(false);
        setRender(false);
      });
    }
  }, [visible]);

  const handleCopy = async (value: string, label: string) => {
    try {
      await Clipboard.setStringAsync(value);

      setToastMessage(`${label} copied to clipboard`);
      setToastVisible(true);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  if (!render) return null;

  return (
    <Box
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        pointerEvents: animating ? "none" : "auto",
      }}
    >
      {/* DIM OVERLAY — fades in first on open, fades out last on close */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
          },
          { opacity: overlayOpacity },
        ]}
      />

      {/* Tap-to-dismiss area sits on top of overlay but behind the sheet */}
      <TouchableWithoutFeedback
        onPress={() => {
          if (!animating) {
            Keyboard.dismiss();
            onClose();
          }
        }}
      >
        <Box style={{ flex: 1 }} />
      </TouchableWithoutFeedback>

      {/* BOTTOM SHEET — must stay Animated.View for animation support */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            paddingLeft: 24,
            paddingRight: 24,
            paddingTop: 24,
            paddingBottom: Math.max(32, insets.bottom + 16),
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            elevation: 10,
          },
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* HEADER */}
        <HStack className="justify-between items-center mb-2">
          <HStack space="sm" className="items-center">
            <Headphones size={22} color="#00a8e3" />
            <Text className="text-[#00a8e3] font-bold text-lg">
              Contact To Admin
            </Text>
          </HStack>

          <Pressable
            onPress={() => {
              if (!animating) onClose();
            }}
            disabled={animating}
            className="p-1.5 bg-slate-100 rounded-full active:scale-95"
          >
            <X size={18} color="#64748b" />
          </Pressable>
        </HStack>

        <Divider className="bg-slate-100 mb-6" />

        {/* CONTENT */}
        <VStack space="md">
          <CopyableRow
            label="Email"
            value="support@carrental-system.mm"
            icon={Mail}
            onCopy={handleCopy}
          />

          <CopyableRow
            label="Phone"
            value="09989243127"
            icon={Phone}
            onCopy={handleCopy}
          />
        </VStack>
      </Animated.View>

      {/* TOAST */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onClose={() => setToastVisible(false)}
      />
    </Box>
  );
}