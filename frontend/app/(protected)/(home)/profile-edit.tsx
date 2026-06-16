import React from 'react';
import { useAuthStore } from "@/store/useAuthStore";
import { OwnerProfileEdit } from '@/components/owner/OwnerProfileEdit';
import { RenterProfileEdit } from '@/components/renter/RenterProfileEdit';
import { View, ActivityIndicator } from "react-native";

export default function EditControllerScreen() {
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!profile) return null;

  const isCarOwner = profile.role === "car_owner";

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Check condition and show separate component based on role */}
      {isCarOwner ? (
        <OwnerProfileEdit data={profile} />
      ) : (
        <RenterProfileEdit data={profile}/>
      )}
    </View>
  );
}