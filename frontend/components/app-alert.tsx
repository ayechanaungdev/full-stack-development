import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import Entypo from "@expo/vector-icons/Entypo";
import React from "react";
import { Modal, Pressable } from "react-native";

type AlertAction = {
  text: string;
  onPress?: () => void;
  type?: "cancel" | "default";
};

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
  actions?: AlertAction[];
};

const CustomAlert = ({
  visible,
  title,
  message,
  type = "info",
  onClose,
  actions = [],
}: CustomAlertProps) => {
  const iconConfig = {
    success: { name: "check", bg: "bg-green-100", color: "#16a34a" },
    error: { name: "cross", bg: "bg-red-100", color: "#dc2626" },
    warning: { name: "warning", bg: "bg-yellow-100", color: "#d97706" },
    info: { name: "info", bg: "bg-blue-100", color: "#2563eb" },
  };

  const current = iconConfig[type];

  return (
    <Modal transparent animationType="fade" visible={visible}>
      {/* Background overlay */}
      <Pressable
        className="flex-1 bg-black/30 justify-center items-center px-6"
        onPress={onClose}
      >
        {/* Alert Card */}
        <Pressable
          className="w-full max-w-md bg-brand-0 rounded-3xl p-6 shadow-soft-4">
          <VStack space="lg">
            {/* Header */}
            <HStack className="items-center gap-3">
              <Box
                className={`w-10 h-10 rounded-full items-center justify-center ${current.bg}`}
              >
                <Entypo
                  name={current.name as any}
                  size={18}
                  color={current.color}
                />
              </Box>

              <Text className="text-lg font-semibold text-black flex-1">
                {title}
              </Text>
            </HStack>

            {/* Message */}
            <Text className="text-sm text-gray-500 leading-5">
              {message}
            </Text>

            {/* Actions */}
            <HStack className="justify-end gap-3 mt-2">
              {actions.map((action, index) => {
                const isCancel = action.type === "cancel";

                return (
                  <Button
                    key={index}
                    onPress={() => {
                      action.onPress?.();
                      onClose();
                    }}
                    className={`px-6 py-2 rounded-2xl border border-brand-200 ${
                      isCancel
                        ? "bg-brand-100"
                        : "bg-brand-700"
                    }`}
                  >
                    <ButtonText
                      className={`text-sm font-medium ${
                        isCancel
                          ? "text-black"
                          : "text-white"
                      }`}
                    >
                      {action.text}
                    </ButtonText>
                  </Button>
                );
              })}
            </HStack>
          </VStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
export default CustomAlert;