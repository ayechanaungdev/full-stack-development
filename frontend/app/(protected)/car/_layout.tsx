import { BackButton } from "@/components/BackButton";
import { Stack } from "expo-router";

export default function CarLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#F7FDFF",
          },
          headerTitleStyle: {
            color: "#0a7ea4",
            fontSize: 18,
            fontWeight: "600",
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="bookingForm"
          options={{
            title: "Rental Booking",
            headerLeft: () => <BackButton />,
          }}
        />

        <Stack.Screen
          name="editcar"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="addcar"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
