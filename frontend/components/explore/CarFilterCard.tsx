import DatePicker from "@/components/date_picker";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import tailwindConfig from "@/tailwind.config";
import { Ionicons } from "@expo/vector-icons";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { Dimensions, Pressable, View } from "react-native";
import resolveConfig from "tailwindcss/resolveConfig";

type Township = {
  name: string;
  postalCode: string;
};

type Props = {
  selectedTownship: Township | null;
  pickupDate?: string;
  setPickupDate: (date: string) => void;
  returnDate?: string;
  setReturnDate: (date: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  minPrice: number;
  maxPrice: number;
  onReset: () => void;
  onSearch: () => void;
  onOpenLocation: () => void;
};

const fullConfig = resolveConfig(tailwindConfig) as any;
const brand = fullConfig.theme.colors.brand;
const shadowStyle = {
  shadowColor: brand[925],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

export default function CarFilterSection({
  selectedTownship,
  pickupDate,
  setPickupDate,
  returnDate,
  setReturnDate,
  priceRange,
  setPriceRange,
  minPrice,
  maxPrice,
  onReset,
  onSearch,
  onOpenLocation,
}: Props) {
  const screenWidth = Dimensions.get("window").width;

  return (
    <Box
      style={shadowStyle}
      className="bg-brand-100 mx-4 p-4 mt-3 rounded-2xl mb-2"
    >
      <VStack space="xs">
        {/* Location */}
        <VStack space="xs">
          <Text className="text-[14px] font-normal text-black">
            Car Location
          </Text>

          <Pressable onPress={onOpenLocation}>
            <HStack className="h-11 bg-white border border-gray-300 rounded-xl px-4 items-center justify-between">
              <HStack className="items-center space-x-2">
                <Ionicons name="location-sharp" size={18} color="#0a7ea4" />
                <Text className="text-black opacity-80 text-[14px] font-normal">
                  {selectedTownship?.name || "Select Location"}
                </Text>
              </HStack>

              <Ionicons name="chevron-down" size={18} color="#0a7ea4" />
            </HStack>
          </Pressable>
        </VStack>

        {/* Dates */}
        <VStack space="xs" className="mt-1">
          <HStack className="gap-8">
            <DatePicker
              label="Pick-up Date"
              value={pickupDate}
              onChange={(date) => {
                if (date) setPickupDate(date);
              }}
            />

            <DatePicker
              label="Return Date"
              value={returnDate}
              onChange={(date) => {
                if (date) setReturnDate(date);
              }}
              minimumDate={new Date()}
            />
          </HStack>
        </VStack>

        {/* Price */}
        <VStack space="xs" className="mt-1">
          <HStack className="justify-between items-center">
            <Text className="text-[14px] font-normal text-black">
              Price per Day (MMK)
            </Text>

            <Text className="text-[14px] font-semibold text-brand-850">
              {priceRange[0].toLocaleString()} -{" "}
              {priceRange[1].toLocaleString()}
            </Text>
          </HStack>

          <View
            style={{
              alignItems: "center",
              marginTop: -12,
              marginBottom: -13,
            }}
          >
            <MultiSlider
              values={[priceRange[0], priceRange[1]]}
              min={minPrice}
              max={maxPrice}
              step={50000}
              onValuesChange={(values) => setPriceRange([values[0], values[1]])}
              sliderLength={screenWidth - 110}
              selectedStyle={{ backgroundColor: "#16a8e3" }}
              unselectedStyle={{
                backgroundColor: "#EBE1E1",
                height: 3,
              }}
              trackStyle={{
                height: 3,
                borderRadius: 10,
              }}
              markerStyle={{
                backgroundColor: "#16a8e3",
                height: 16,
                width: 16,
                borderRadius: 8,
              }}
            />
          </View>
        </VStack>

        {/* Buttons */}
        <HStack className="mt-1 px-3" style={{ gap: 30 }}>
          <Pressable
            onPress={onReset}
            className="flex-1 h-10 rounded-xl border border-brand-850 items-center justify-center bg-white"
          >
            <Text className="text-brand-850 text-[14px] font-medium">
              Reset
            </Text>
          </Pressable>

          <Pressable
            onPress={onSearch}
            className="flex-1 h-10 rounded-xl items-center justify-center bg-brand-700"
          >
            <Text className="text-white text-[14px] font-medium">Search</Text>
          </Pressable>
        </HStack>
      </VStack>
    </Box>
  );
}
