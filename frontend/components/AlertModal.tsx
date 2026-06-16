import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react-native";
import React from "react";
import { Modal, Text, TouchableWithoutFeedback, View } from "react-native";
import { Button, ButtonText } from "./ui/button";
import { Icon } from "./ui/icon";
import { VStack } from "./ui/vstack";

type AlertType = "success" | "error" | "info" | "warning";

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: AlertType;
  buttonText?: string;
  onConfirm?: () => void;
}

/**
 * A simplified, small, and consistent Alert Modal.
 * Aligns with the app's theme and provides clear feedback.
 */
export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = "success",
  buttonText = "Okay",
  onConfirm,
}) => {
  // --- Icon Configuration ---
  const getIcon = () => {
    const iconSize = 32;
    // Using Tailwind classes for colors instead of hardcoded hex codes
    switch (type) {
      case "success":
        return (
          <Icon
            as={CheckCircle2}
            width={iconSize}
            height={iconSize}
            className="text-brand-600"
          />
        );
      case "error":
        return (
          <Icon
            as={XCircle}
            width={iconSize}
            height={iconSize}
            className="text-error-600"
          />
        );
      case "warning":
        return (
          <Icon
            as={AlertTriangle}
            width={iconSize}
            height={iconSize}
            className="text-warning-600"
          />
        );
      case "info":
      default:
        return (
          <Icon
            as={Info}
            width={iconSize}
            height={iconSize}
            className="text-brand-600"
          />
        );
    }
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <TouchableWithoutFeedback>
            <View className="bg-brand-50 rounded-3xl w-full max-w-[320px] overflow-hidden shadow-2xl border border-brand-100">
              <VStack className="p-8 items-center" space="lg">
                {/* Icon with soft background */}
                <View className="p-4 bg-white rounded-full shadow-sm mb-2">
                  {getIcon()}
                </View>

                {/* Content */}
                <VStack className="items-center w-full" space="sm">
                  <Text className="text-2xl font-semibold text-typography-900 text-center tracking-tight">
                    {title}
                  </Text>
                  <Text className="text-md text-typography-600 text-center leading-6 mt-1 px-2">
                    {message}
                  </Text>
                </VStack>

                {/* Action Button */}
                <Button
                  size="lg"
                  className={`w-full mt-6 rounded-2xl h-14 shadow-sm ${
                    type === "success"
                      ? "bg-brand-500"
                      : type === "error"
                        ? "bg-error-100"
                        : "bg-brand-100"
                  }`}
                  onPress={handleConfirm}
                >
                  <ButtonText
                    className={`font-semibold text-lg ${
                      type === "success"
                        ? "text-white"
                        : type === "error"
                          ? "text-error-700"
                          : "text-brand-800"
                    }`}
                  >
                    {buttonText}
                  </ButtonText>
                </Button>
              </VStack>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
