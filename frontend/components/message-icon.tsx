import { useBadgeCounts } from "@/store/useBadgeStore";
import { useAuthStore } from "@/store/useAuthStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Text, View } from "react-native";

export function MessageIcon({
  focused,
  color,
}: {
  focused: boolean;
  color: string;
}) {
  const { user } = useAuthStore();
  const { data: badges } = useBadgeCounts(user?.id);
  const messages = badges?.messages || 0;
  const displayBadge = messages > 9 ? "9+" : messages.toString();

  return (
    <View
      style={{
        width: 60,
        height: 38,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
      }}
    >
      {/* Background Circle for Icon */}
      <View
        style={{
          width: 60,
          height: 38,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 20,
          backgroundColor: focused ? "rgba(22, 168, 227, 0.1)" : "transparent",
        }}
      >
        <Ionicons
          name={focused ? "chatbubbles" : "chatbubbles-outline"}
          size={24}
          color={color}
        />
      </View>

      {messages > 0 && (
        <View
          style={{
            position: "absolute",
            right: 10,
            top: 2,
            backgroundColor: "#FF3B30", // Red badge
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 4,
            borderWidth: 2,
            borderColor: "#f0fafe",
          }}
        >
          <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
            {displayBadge}
          </Text>
        </View>
      )}
    </View>
  );
}
