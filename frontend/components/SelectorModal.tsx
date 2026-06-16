import { Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface SelectorModalProps {
  visible: boolean;
  onClose: () => void;
  options: any[];
  onSelect: (option: any) => void;
  title: string;
  labelField?: string;
  valueField?: string;
  selectedValue?: any;
  renderCustomItem?: (item: any, isSelected: boolean) => React.ReactNode;
  emptyMessage?: string;
}

export const SelectorModal: React.FC<SelectorModalProps> = ({
  visible,
  onClose,
  options,
  onSelect,
  title,
  labelField,
  valueField,
  selectedValue,
  renderCustomItem,
  emptyMessage,
}) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!visible) setSearch("");
  }, [visible]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter((item) => {
      const label =
        typeof item === "string" ? item : String(item[labelField || "name"]);
      return label.toLowerCase().includes(term);
    });
  }, [options, search, labelField]);

  const handleSelect = (item: any) => {
    Keyboard.dismiss();
    onSelect(item);
    onClose();
    setSearch("");
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const label =
        typeof item === "string" ? item : item[labelField || "name"];
      const value =
        typeof item === "string" ? item : item[valueField || "value"];
      const isSelected =
        valueField != null ? selectedValue === value : selectedValue === label;

      if (renderCustomItem) {
        return (
          <TouchableOpacity
            activeOpacity={0.7}
            className="mb-2"
            onPress={() => handleSelect(item)}
          >
            {renderCustomItem(item, isSelected)}
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          className={`min-h-[64px] py-4 px-5 mb-2 rounded-2xl items-center justify-center ${
            isSelected
              ? "bg-brand-100"
              : "bg-white border border-typography-100"
          }`}
          onPress={() => handleSelect(item)}
        >
          <Text
            className={`text-lg font-bold text-center ${
              isSelected ? "text-brand-800" : "text-typography-800"
            }`}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    },
    [labelField, valueField, selectedValue, renderCustomItem],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen" // ✅ iOS FIX
    >
      {/* Overlay */}
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      >
        <View className="absolute inset-0 bg-black/60" />
      </TouchableWithoutFeedback>

      <View className="flex-1 justify-end">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="bg-white rounded-t-[40px] p-6 pb-8 max-h-[80%] flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-bold text-typography-900">
                {title}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-typography-100 rounded-full"
              >
                <X size={20} color="#737373" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="flex-row items-center bg-typography-50 border border-typography-200 rounded-2xl px-4 h-12 mb-4">
              <Search size={18} color="#A3A3A3" />
              <TextInput
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChangeText={setSearch}
                maxLength={30}
                className="flex-1 ml-3 text-md text-typography-800"
                placeholderTextColor="#A3A3A3"
                autoCapitalize="none"
                returnKeyType="done"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <X size={16} color="#A3A3A3" />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filteredOptions}
              renderItem={renderItem}
              keyExtractor={(item, index) =>
                typeof item === "string"
                  ? `${item}-${index}`
                  : `${item[labelField || "name"]}-${index}`
              }
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={() => (
                <View className="py-10 items-center">
                  <Text className="text-typography-400">
                    {emptyMessage || "No matching items found"}
                  </Text>
                </View>
              )}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};
