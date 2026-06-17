import OwnerDashboard from "@/components/owner/OwnerDashboard";
import RenterDashboard from "@/components/renter/RenterDashboard";
import { useAuthStore } from "@/store/useAuthStore";
import React from "react";

export default function DashboardScreen() {
  const { role } = useAuthStore();

  if (role === "car_owner") {
    return <OwnerDashboard />;
  }

  return <RenterDashboard />;
}
