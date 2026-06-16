import React from "react";
import { Modal, Text, View, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  selectedValueString: string;
  onChange: (timeStr: string) => void;
  onClose: () => void;
  title?: string;
};

const timeSlots = (() => {
  const slots: { label: string; value: string }[] = [];
  for (let hour = 5; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break;
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const displayMinute = minute === 0 ? "00" : "30";
      const label = `${displayHour}:${displayMinute} ${ampm}`;
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      slots.push({ label, value });
    }
  }
  return slots;
})();

export default function TimePicker({
  visible,
  selectedValueString,
  onChange,
  onClose,
  title = "Select Time",
}: Props) {
  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={styles.container}>
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#737373" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={timeSlots}
              keyExtractor={(item) => item.value}
              style={styles.listStyle}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValueString;

                return (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.7}
                    onPress={() => {
                      onChange(item.value);
                      onClose();
                    }}
                    style={[
                      styles.timeSlot,
                      isSelected ? styles.timeSlotSelected : styles.timeSlotUnselected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        isSelected ? styles.timeTextSelected : styles.timeTextUnselected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingBottom: 32,
    maxHeight: height * 0.8,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#171717",
  },
  closeButton: {
    backgroundColor: "#F5F5F5",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  listStyle: {
    width: "100%",
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  timeSlot: {
    minHeight: 64,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  timeSlotUnselected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  timeSlotSelected: {
    backgroundColor: "#32B6EA",
    borderWidth: 1,
    borderColor: "#32B6EA",
  },
  timeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  timeTextUnselected: {
    color: "#262626",
  },
  timeTextSelected: {
    color: "#FFFFFF",
  },
});