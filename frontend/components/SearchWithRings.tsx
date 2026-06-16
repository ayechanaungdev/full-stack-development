import { Icon } from "@/components/ui/icon";
import tailwindConfig from "@/tailwind.config";
import { Search } from "lucide-react-native";
import React from "react";
import { Animated, View } from "react-native";
import resolveConfig from "tailwindcss/resolveConfig";

const fullConfig = resolveConfig(tailwindConfig) as any;
const brand = fullConfig.theme.colors.brand;

export function SearchWithRings() {
  const pulse1 = React.useRef(new Animated.Value(0)).current;
  const pulse2 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse1, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(pulse1, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(pulse2, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(pulse2, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse1, pulse2]);

  const ring1Style = {
    transform: [
      {
        scale: pulse1.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.22],
        }),
      },
    ],
    opacity: pulse1.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0],
    }),
  };

  const ring2Style = {
    transform: [
      {
        scale: pulse2.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.18],
        }),
      },
    ],
    opacity: pulse2.interpolate({
      inputRange: [0, 1],
      outputRange: [0.28, 0],
    }),
  };

  return (
    <View
      style={{
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
      }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 2.2,
            borderColor: brand[700],
          },
          ring1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1.8,
            borderColor: brand[700],
          },
          ring2Style,
        ]}
      />
      <View
        style={{
          position: "absolute",
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: `${brand[700]}33`,
        }}
      />
      <Icon
        as={Search}
        size="2xl"
        className="text-brand-700"
        style={{ strokeWidth: 2.4 }}
      />
    </View>
  );
}
