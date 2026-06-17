import { Box } from "@/components/ui/box";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text, TouchableOpacity } from "react-native";

type ToastType = "success" | "error" | "info" | "warning";

type ToastProps = {
  visible: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
};

const toastConfig = {
  success: {
    icon: "checkmark-circle",
    color: "#00a8e3", // brand blue (login background color)
    border: "#00a8e3",
  },
  error: {
    icon: "close-circle",
    color: "#dc2626", // red
    border: "#dc2626",
  },
  info: {
    icon: "information-circle",
    color: "#1078a2", // blue
    border: "#1078a2",
  },
  warning: {
    icon: "warning",
    color: "#f59e0b", // yellow
    border: "#f59e0b",
  },
};

export default function Toast({
  visible,
  message,
  type = "info",
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Box className="absolute bottom-40 left-0 right-0 z-50 items-center">
      <Box
        className="flex-row items-center px-4 py-2 rounded-[10px] shadow-md bg-white"
        style={{
          borderWidth: 1,
          borderColor: `${config.border}80`,
          //ios shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,

          // android shadow
          elevation: 4,
        }}
      >
        {/* Icon */}
        <Ionicons
          name={config.icon as any}
          size={18}
          color={config.color}
          style={{ marginRight: 6 }}
        />

        {/* Text */}
        <Text
          className="text-sm"
          style={{ color: config.color, maxWidth: 220 }}
          // numberOfLines={1}
        >
          {message}
        </Text>

        {/* Close */}
        <TouchableOpacity onPress={onClose} className="ml-3">
          <Ionicons name="close" size={16} color={config.color} />
        </TouchableOpacity>
      </Box>
    </Box>
  );
}
