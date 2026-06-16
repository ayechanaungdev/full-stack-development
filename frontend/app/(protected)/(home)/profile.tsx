import OwnerProfile from "@/components/owner/OwnerProfile";
import { RenterProfile } from "@/components/renter/RenterProfile";
import { Pressable } from "@/components/ui/pressable";
import { useAuthStore } from "@/store/useAuthStore";
import React from "react";
import { Text, View } from "react-native";

export default function ProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const { signOut } = useAuthStore();

  if (!profile) return null;

  const isCarOwner = profile.role === "car_owner";
  const isRenter = profile.role === "renter";

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Conditional Profile Content */}
      {isCarOwner && <OwnerProfile data={profile} />}
      {isRenter && <RenterProfile data={profile} />}
    </View>
  );
}
