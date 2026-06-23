import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Text, View } from "react-native";

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/auth/login");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="items-center">
        <Text className="text-typography-800 text-lg font-bold">
          Google Sign-In Coming Soon
        </Text>
        <Text className="mt-2 text-typography-500 text-center text-sm">
          Google OAuth is not available yet. Please use email and password to
          sign in.
        </Text>
      </View>
    </View>
  );
}
