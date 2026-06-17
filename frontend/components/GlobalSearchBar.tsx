import { Box } from "@/components/ui/box";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import Entypo from "@expo/vector-icons/Entypo";
import { SearchIcon } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";
import { shadowStyle } from "./CarCard";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export default function GlobalSearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
}: Props) {
  return (
    <Box className="px-4 pt-2 mb-1">
      <Input
        style={[shadowStyle, { borderColor: "#c7ebfc" }]}
        className="bg-white rounded-xl px-3 h-12 border border-info-100 focus:border-info-50"
      >
        <InputField
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          className="text-sm"
        />

        <InputSlot>
          {value.length > 0 ? (
            <Pressable onPress={() => onChangeText("")} hitSlop={10}>
              <Entypo name="cross" size={18} color="#9CA3AF" />
            </Pressable>
          ) : (
            <SearchIcon width={14} height={14} stroke="#9CA3AF" />
          )}
        </InputSlot>
      </Input>
    </Box>
  );
}
