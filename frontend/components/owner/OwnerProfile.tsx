import CustomAlert from "@/components/app-alert";
import { setPendingLoginToast } from "@/components/renter/RenterProfile";
import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import yangontownships from "@/constants/yangon-townships.json";
import { supabase } from "@/lib/supabase";
import { Profile, useAuthStore } from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CarFront, Check, PencilLine } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OwnerProfile({ data: initialData }: { data: Profile }) {
  const user = useAuthStore((state) => state.user);
  const { signOut } = useAuthStore();

  type ToastType = "success" | "error" | "info" | "warning";

  const params = useLocalSearchParams<{
    toastMessage: string;
    toastType: ToastType;
  }>();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");
  const [alertVisible, setAlertVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  const {
    data: profileData = initialData,
    isLoading,
    isError: errorOccurred,
  } = useQuery({
    queryKey: ["owner_profile", initialData.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", initialData.id)
        .single();

      if (error) throw error;
      return data;
    },
    initialData,
  });

  /*Adding Township name*/
  const townshipData = yangontownships.find(
    (t) => t.postalCode === profileData.postal_code,
  );

  const townshipName = townshipData ? `${townshipData.name} Township` : "";
  const removecomma = profileData.location
    ? profileData.location.trim().replace(/,+$/, "")
    : "";
  const displayAddress =
    [removecomma, townshipName].filter(Boolean).join(", ") ||
    "No address provided";

  const handleLogout = async () => {
    try {
      isLoggingOutRef.current = true;
      setIsLoggingOut(true);
      setPendingLoginToast("Logged out successfully.", "warning");
      // Add a brief delay for a smoother logging out transition
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await signOut();
    } catch (error) {
      isLoggingOutRef.current = false;
      setIsLoggingOut(false);
      setAlertVisible(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (params.toastMessage) {
        setToastMessage(params.toastMessage);
        setToastType(params.toastType || "info");
        setToastVisible(true);
        router.setParams({ toastMessage: undefined, toastType: undefined });
      }
    }, [params.toastMessage, params.toastType]),
  );

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center bg-brand-0">
        <Spinner size="large" color="#16a8e3" />
      </Box>
    );
  }

  /*if there is error occurred*/
  if (errorOccurred) {
    return (
      <Box className="flex-1 justify-center items-center bg-white p-6">
        <VStack space="xs" className="items-center">
          <Text className="text-slate-600 text-center px-6">
            Something went wrong.
          </Text>
          <Text className="text-slate-600 text-center px-6">
            Please try again later.
          </Text>
        </VStack>
        <Pressable
          onPress={() => signOut()}
          className="bg-brand-600 px-12 py-3 rounded-xl active:bg-brand-900 mt-4"
        >
          <Text className="text-white font-semibold text-base">Sign Out</Text>
        </Pressable>
      </Box>
    );
  }

  return (
    <>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <Box className="flex-1 bg-brand-50">
          <ScrollView showsVerticalScrollIndicator={false}>
            <VStack space="lg" className="w-full p-4">
              {/* Image Card Field */}
              <Card className="p-4 rounded-2xl bg-white shadow-sm">
                <HStack space="lg" className="items-center">
                  {/* Image Container */}
                  <Box className="rounded-full border-4 border-brand-700 p-1 bg-white">
                    <Image
                      size="lg"
                      source={{
                        uri:
                          profileData.avatar_url ||
                          require("@/assets/images/avatar1.png"),
                      }}
                      alt="Profile"
                      className="rounded-full"
                    />
                  </Box>
                  {/* Info */}
                  <VStack space="xs" className="flex-1 py-5">
                    <Text className="text-lg font-bold text-black">
                      {profileData.full_name}
                    </Text>
                    {/* Icon and Info */}
                    <HStack
                      className="bg-brand-200 self-start px-3 rounded-xl items-center rounded-xl p-2"
                      space="xs"
                    >
                      <Box className="bg-brand-700 rounded-md">
                        <CarFront size={24} color="white" />
                      </Box>
                      <Text className="font-bold text-black">
                        {profileData.role}
                      </Text>
                    </HStack>
                    <Text className="font-bold  text-black">{user?.email}</Text>
                  </VStack>
                </HStack>
              </Card>
              {/* Info Card Field */}
              <Card className="p-4 rounded-2xl bg-white shadow-sm">
                <VStack space="lg">
                  {/* Phone Number */}
                  <HStack className="items-center border-b border-slate-200 pb-6 py-5">
                    <Text className="text-slate-500 w-32">Mobile No. </Text>
                    <Text className="font-medium text-slate-800">
                      {profileData.phone}
                    </Text>
                  </HStack>
                </VStack>
                {/* Address */}
                <HStack className="items-center border-b border-slate-200 py-5">
                  <Text className="text-slate-500 w-32">Address </Text>
                  <Text className="font-medium text-slate-800 flex-1">
                    {displayAddress}
                  </Text>
                </HStack>
                {/* NRC */}
                <HStack className="items-center border-slate-200 pb-6 py-5">
                  <Text className="text-slate-500 w-32">NRC No.</Text>
                  <Text className="font-medium text-slate-800 flex-1">
                    {profileData.nrc}
                  </Text>
                </HStack>
              </Card>
              {/* Setting Card */}
              <Card className="p-4 rounded-2xl bg-white shadow-sm flex">
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() =>
                    router.push("/(protected)/(home)/change-password")
                  }
                >
                  <Card className="p-4 rounded-2xl bg-white shadow-sm px-5 items-center border-b border-slate-200 pb-6 py-5">
                    <HStack className="items-center justify-center w-full gap-2">
                      <Text className="font-medium text-slate-800">
                        Change Password
                      </Text>
                      <PencilLine />
                    </HStack>
                  </Card>
                </TouchableOpacity>
                {/* Inquiries and support /// SMA edited */}
                <TouchableOpacity
                  onPress={() => router.push(`/(protected)/(home)/inquiry`)}
                >
                  <Card className="p-4 rounded-2xl bg-white shadow-sm px-5">
                    <HStack space="md" className="items-center justify-center">
                      <Text className="font-medium">Inquiries & Support</Text>
                      <Ionicons
                        name="alert-circle"
                        size={20}
                        color="black"
                        className="mr-1"
                      />
                    </HStack>
                  </Card>
                </TouchableOpacity>
              </Card>
              {/* NRC image field */}
              <Card className="p-4 rounded-2xl bg-white shadow-sm px-5">
                <VStack space="md" className="items-center">
                  <Box className="w-full border-2 border-dashed border-brand-200 rounded-xl p-1 overflow-hidden">
                    <Image
                      size="lg"
                      source={{
                        uri:
                          profileData.nrc_url ||
                          require("@/assets/images/my-card-f.jpg"),
                      }}
                      alt="image"
                      className="w-full h-48"
                      resizeMode="contain"
                    />
                  </Box>
                  <HStack space="xs" className="items-center">
                    <Text className="text-slate-600 font-medium">
                      NRC (Verified){" "}
                    </Text>
                    <Check size={16} color="green" />
                  </HStack>
                </VStack>
              </Card>

              {/* Sign out button */}
              <View className="mb-10 w-full px-4">
                <Pressable
                  onPress={() => setAlertVisible(true)}
                  className="w-full max-w-sm self-center flex-row items-center justify-center rounded-xl bg-brand-600 px-5 py-3 active:bg-brand-900"
                  style={{ minHeight: 48 }}
                >
                  <Text
                    className="text-center text-base font-semibold text-white"
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    Sign Out
                  </Text>
                </Pressable>
              </View>
            </VStack>
          </ScrollView>
        </Box>
      </SafeAreaView>
      <CustomAlert
        visible={alertVisible}
        title="Confirm Sign Out"
        message="Are you sure you want to sign out?"
        type="warning"
        onClose={() => {
          if (!isLoggingOutRef.current) {
            setAlertVisible(false);
          }
        }}
        actions={
          isLoggingOut
            ? [
                {
                  text: (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          top: -12,
                          bottom: -12,
                          left: -26,
                          right: -26,
                          borderRadius: 16,
                          backgroundColor: "#ffffff",
                          opacity: 0.5,
                        }}
                      />
                      <Text
                        className="text-gray-400 font-semibold text-sm"
                        style={{ opacity: 0.5 }}
                      >
                        Cancel
                      </Text>
                    </View>
                  ) as any,
                  type: "cancel",
                  onPress: () => {},
                },
                {
                  text: (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          top: -12,
                          bottom: -12,
                          left: -26,
                          right: -26,
                          borderRadius: 16,
                          backgroundColor: "#ffffff",
                          opacity: 0.3,
                        }}
                      />
                      <ActivityIndicator
                        size="small"
                        color="white"
                        style={{ marginRight: 6, opacity: 0.7 }}
                      />
                      <Text
                        className="text-white font-semibold text-sm"
                        style={{ opacity: 0.7 }}
                      >
                        Signing out...
                      </Text>
                    </View>
                  ) as any,
                  type: "default",
                  onPress: () => {},
                },
              ]
            : [
                {
                  text: "Cancel",
                  type: "cancel",
                  onPress: () => setAlertVisible(false),
                },
                {
                  text: "Sign Out",
                  onPress: handleLogout,
                },
              ]
        }
      />
    </>
  );
}
