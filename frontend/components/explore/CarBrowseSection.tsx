import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Filter } from "lucide-react-native";
import { Pressable } from "react-native";

type Props = {
  activeCategory: string;
  offSetCars: number;
  totalCars: number;

  isGrid: boolean;
  onToggleGrid: () => void;

  sortOrder: "asc" | "desc";
  onChangeSortOrder: (order: "asc" | "desc") => void;
  onOpenFilter: () => void;
  isFilterApplied: boolean;
};

export default function CarBrowseHeader({
  activeCategory,
  offSetCars,
  totalCars,
  isGrid,
  onToggleGrid,
  sortOrder,
  onChangeSortOrder,
  onOpenFilter,
  isFilterApplied,
}: Props) {
  return (
    <>
      {/* Available Cars + Sort + Grid + Filter */}
      <HStack className="justify-between items-center px-3 mb-2  mx-2">
        <Text className="text-[14px] text-typography-black font-regular">
          <Text className="text-brand-850 font-semibold">{offSetCars}</Text> Out
          Of <Text className="text-brand-850 font-semibold">{totalCars}</Text>{" "}
          Cars Showing
        </Text>

        <HStack space="md" className="items-center">
          <Pressable
            onPress={onToggleGrid}
            className="flex-row items-center"
            style={{ gap: 4, padding: 2 }}
          >
            <Ionicons
              name={isGrid ? "grid" : "grid-outline"}
              size={22}
              color="#1078a2"
            />
          </Pressable>

          <HStack space="sm" className="items-center">
            {/* ASC */}
            <Pressable
              onPress={() => onChangeSortOrder("asc")}
              style={{ padding: 2 }}
            >
              <FontAwesome5
                name="sort-amount-down-alt"
                size={20}
                color={sortOrder === "asc" ? "#1078a2" : "#9CA3AF"}
              />
            </Pressable>

            {/* DESC */}
            <Pressable
              onPress={() => onChangeSortOrder("desc")}
              style={{ padding: 2 }}
            >
              <FontAwesome5
                name="sort-amount-up"
                size={20}
                color={sortOrder === "desc" ? "#1078a2" : "#9CA3AF"}
              />
            </Pressable>
          </HStack>

          <Pressable
            onPress={onOpenFilter}
            className="flex-row items-center"
            style={{ gap: 4, padding: 4 }}
          >
            {isFilterApplied ? (
              <Filter size={20} color="#1078a2" fill="#1078a2" />
            ) : (
              <Filter size={20} color="#1078a2" />
            )}
          </Pressable>
        </HStack>
      </HStack>
    </>
  );
}
