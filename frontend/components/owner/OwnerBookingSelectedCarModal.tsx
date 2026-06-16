import { Box } from "@/components/ui/box";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import townships from "../../constants/yangon-townships.json";
import Toast from "../Toast";

type Props = {
  visible: boolean;
  onClose: () => void;
  car: any;
};

const CarDetailModal = ({ visible, onClose, car }: Props) => {
  const carImage = car?.car_images?.[0]?.image_url;

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const copyCarNoToClipboard = async (carNo: string | null | undefined) => {
    if (!carNo) return;

    await Clipboard.setStringAsync(carNo);

    setToastMessage("Car number copied to clipboard.");
    setToastVisible(true);
  };

  if (!car) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
          }}
        >
          <TouchableWithoutFeedback>
            <Card className="bg-white rounded-3xl w-11/12 max-w-md px-6 py-5 max-h-[75%]">
              {/* Close Button */}
              <Pressable
                onPress={onClose}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 14,
                  zIndex: 10,
                }}
                hitSlop={12}
              >
                <Text className="text-3xl text-slate-400 font-bold">×</Text>
              </Pressable>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {/* Car Image */}
                <VStack className="items-center">
                  <Box className="bg-slate-100 rounded-2xl p-3">
                    <Image
                      source={
                        carImage
                          ? { uri: carImage }
                          : require("@/assets/images/icon.png")
                      }
                      style={{
                        width: 220,
                        height: 120,
                      }}
                      resizeMode="contain"
                    />
                  </Box>

                  {/* Title */}
                  <Text className="text-xl font-bold text-black mt-5">
                    {car.brand} {car.model}
                  </Text>

                  <Text className="text-slate-500 text-[14px] mt-1">
                    {car.car_type}
                  </Text>
                </VStack>

                {/* Details */}
                <VStack className="mt-5">
                  <InfoRow
                    label="Car Number"
                    value={car.car_number}
                    copyable
                    onCopy={() => copyCarNoToClipboard(car.car_number)}
                  />

                  <InfoRow label="Brand" value={car.brand} />

                  <InfoRow label="Model" value={car.model} />

                  <InfoRow label="Seats" value={`${car.seats ?? "-"} Seats`} />

                  <InfoRow
                    label="Price / Day"
                    value={`${car.price_per_day} MMK`}
                  />

                  <InfoRow
                    label="Location"
                    value={(() => {
                      const township = townships.find(
                        (t) => t.postalCode === car.postal_code,
                      );

                      return township ? `${township.name} Township` : "-";
                    })()}
                  />
                </VStack>
              </ScrollView>
            </Card>
          </TouchableWithoutFeedback>
        </Pressable>
        {/* Toast */}
        <Toast
          visible={toastVisible}
          message={toastMessage}
          type="success"
          onClose={() => setToastVisible(false)}
        />
      </Modal>
    </>
  );
};

type InfoRowProps = {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
};

const InfoRow = ({ label, value, copyable = false, onCopy }: InfoRowProps) => {
  return (
    <HStack className="items-center border-b border-slate-200 py-4 px-3">
      {/* Left Label */}
      <Text className="text-slate-500 w-32 text-[14px]">{label}</Text>

      {/* Right Side */}
      <HStack className="flex-1 items-center justify-end">
        <Text className="text-slate-800 font-medium text-[14px] text-right">
          {value}
        </Text>

        {copyable && (
          <Pressable onPress={onCopy} className="ml-3" hitSlop={8}>
            <Ionicons name="copy-outline" size={18} color="#16a8e3" />
          </Pressable>
        )}
      </HStack>
    </HStack>
  );
};

export default CarDetailModal;
