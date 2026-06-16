import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { X } from "lucide-react-native";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { shadowStyle } from "../CarCard";

type Props = {
  visible: boolean;
  onClose: () => void;

  categories: string[];
  seatFilters: string[];

  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;

  selectedSeats: string[];
  setSelectedSeats: React.Dispatch<React.SetStateAction<string[]>>;

  onApply: () => void;
  onReset: () => void;
};

export default function CarFilterModal({
  visible,
  onClose,
  categories,
  seatFilters,
  selectedCategories,
  setSelectedCategories,
  selectedSeats,
  setSelectedSeats,
  onApply,
  onReset,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60 justify-end ">
        <Pressable className="flex-1" onPress={onClose} />

        <SafeAreaView
          edges={["bottom"]}
          className="bg-white rounded-t-[40px]"
          style={[shadowStyle, { borderColor: "#c7ebfc" }]}
        >
          <Pressable
            onPress={onClose}
            className="bg-white rounded-t-[34px] px-5 pt-3 pb-8"
          >
            <View className="items-center mb-5">
              <View className="w-11 h-[4px] rounded-full bg-gray-200" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-center mb-8 relative">
              <Text className="text-[17px] font-semibold text-gray-900 align-center">
                Filters
              </Text>
              <Pressable
                onPress={onClose}
                className="absolute right-0 w-9 h-9 rounded-full items-center justify-center"
              >
                <X size={18} color="#6B7280" />
              </Pressable>
            </View>

            {/* Car Type Filter Section */}
            <View className="gap-4">
              <Text className="text-[15px] font-semibold text-gray-800">
                Car Type
              </Text>

              {/* Filter Items */}
              <View className="flex-row flex-wrap gap-3">
                {categories.map((item) => {
                  const isActive = selectedCategories.includes(item);

                  return (
                    <Pressable
                      className="rounded-full"
                      key={item}
                      onPress={() => {
                        if (item === "All Cars") {
                          setSelectedCategories(["All Cars"]);
                          return;
                        }

                        setSelectedCategories((prev) =>
                          prev.includes(item)
                            ? prev.filter((v) => v !== item)
                            : [...prev.filter((v) => v !== "All Cars"), item],
                        );
                      }}
                    >
                      <Box
                        className={`
                        h-11 px-5 rounded-full items-center justify-center 
                        ${isActive ? "bg-brand-700" : "bg-brand-100 "}
                    `}
                      >
                        <Text
                          className={`text-[13px] font-medium ${
                            isActive && "text-white"
                          }`}
                        >
                          {item}
                        </Text>
                      </Box>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Car Seats Filter Section */}
            <View className="gap-4 mt-7">
              <Text className="text-[15px] font-semibold text-gray-800">
                Car Seats
              </Text>

              <View className="flex-row flex-wrap gap-3">
                {seatFilters.map((item) => {
                  const isActive = selectedSeats.includes(item);

                  return (
                    <Pressable
                      className="rounded-full"
                      key={item}
                      onPress={() =>
                        setSelectedSeats((prev) => {
                          const updated = prev.includes(item)
                            ? prev.filter((v) => v !== item)
                            : [...prev, item];

                          return updated;
                        })
                      }
                    >
                      <Box
                        className={`
                          h-11 px-5 rounded-full items-center justify-center
                          ${isActive ? "bg-brand-700" : "bg-brand-100"}
                        `}
                      >
                        <Text
                          className={`text-[13px] font-medium ${
                            isActive && "text-white"
                          }`}
                        >
                          {item}
                        </Text>
                      </Box>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-8 mt-10 px-6">
              {/* Reset */}
              <Pressable
                onPress={onReset}
                className="flex-1 h-12 rounded-full border border-brand-500 items-center justify-center"
              >
                <Text className="text-[15px] font-semibold text-brand-700">
                  Reset
                </Text>
              </Pressable>

              {/* Apply */}
              <Pressable
                onPress={onApply}
                className="flex-1 h-12 rounded-full bg-brand-700 items-center justify-center"
              >
                <Text className="text-[15px] font-semibold text-white">
                  Apply
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
