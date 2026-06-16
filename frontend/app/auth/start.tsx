import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import AnimatedReanimated, { useAnimatedRef } from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const { width, height } = Dimensions.get("window");

const TRACK_WIDTH = 320;
const BUTTON_WIDTH = 160;
const MAX_SWIPE = TRACK_WIDTH - BUTTON_WIDTH - 12;

const slides = [
  { image: require("../../assets/images/car1.jpg") },
  { image: require("../../assets/images/car2.jpg") },
  { image: require("../../assets/images/car3.jpg") },
];

const AnimatedScrollView =
  AnimatedReanimated.createAnimatedComponent(ScrollView);

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  const aref = useAnimatedRef<ScrollView>();
  const pan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const finished = await AsyncStorage.getItem("onboardingFinished");
        if (finished === "true") {
          // Already seen onboarding — skip it silently, nothing is rendered yet
          router.replace("/auth/login");
        } else {
          setLoading(false); // Only now show the onboarding slides
        }
      } catch {
        setLoading(false); // On error, show onboarding as a safe fallback
      }
    };
    checkOnboardingStatus();
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem("onboardingFinished", "true");
    router.replace("/auth/login");
  };

  const handleNext = () => {
    const nextIndex = Math.min(index + 1, slides.length - 1);
    const nextX = nextIndex * width;
    setScrollPos({ x: nextX, y: 0 });
    setIndex(nextIndex);
  };
  const handleSkip = () => {
    const lastIndex = slides.length - 1;
    const lastX = lastIndex * width;

    aref.current?.scrollTo({ x: lastX, animated: true });
    setIndex(lastIndex);
    setScrollPos({ x: lastX, y: 0 });
  };
  const handlePrev = () => {
    const prevIndex = Math.max(index - 1, 0);
    const prevX = prevIndex * width;
    setScrollPos({ x: prevX, y: 0 });
    setIndex(prevIndex);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    setIndex(newIndex);
    setScrollPos({ x: offsetX, y: 0 });
  };

  // Return nothing while we check AsyncStorage — prevents the one-frame flash
  // of onboarding content before the redirect fires for returning users.
  if (loading) return null;

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1">
      <Box className="flex-1 bg-black">
        {index !== slides.length - 1 && (
          <View style={styles.topBar}>
            <Pressable onPress={handleSkip} style={styles.topButton}>
              <Text
                className={`text-base font-medium ${index === 1 ? "text-brand-950" : "text-white"}`}
              >
                Skip
              </Text>
            </Pressable>
          </View>
        )}

        <AnimatedScrollView
          ref={aref}
          horizontal
          pagingEnabled
          contentOffset={scrollPos}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          bounces={false}
          contentContainerStyle={{ width: width * slides.length }}
          style={StyleSheet.absoluteFill}
        >
          {slides.map((item, i) => (
            <ImageBackground
              key={i}
              source={item.image}
              resizeMode="cover"
              style={styles.slide}
            >
              <Box className="flex-1 px-8 pt-32 justify-start">
                {i === 0 && (
                  <>
                    <Text className="text-4xl font-bold text-brand-700">
                      Find the Perfect Car
                    </Text>
                    <Text className="mt-4 text-right text-lg text-brand-700 ml-20">
                      Browse cars available near you.
                    </Text>
                  </>
                )}

                {i === 1 && (
                  <>
                    <Box>
                      <Text className="text-4xl font-bold text-brand-950">
                        Easy Booking
                      </Text>
                      <Text className="mt-2 text-lg text-brand-900">
                        Reserve your car in seconds.
                      </Text>
                    </Box>
                    <Box className="mt-20 self-end">
                      <Text className="text-4xl font-bold text-brand-950 text-right">
                        Real-Time Chat
                      </Text>
                      <Text className="mt-2 text-lg text-brand-900 text-right">
                        Chat instantly with car owners.
                      </Text>
                    </Box>
                  </>
                )}

                {i === 2 && (
                  <Box className="mt-4 w-full">
                    <Text className="text-4xl font-bold text-brand-950">
                      Start your Journey
                    </Text>
                    <Text className="mt-6 text-lg text-brand-900">
                      Pick up your car and enjoy the ride.
                    </Text>

                    <Box className="mt-24 w-full items-center">
                      <Pressable
                        onPress={finishOnboarding}
                        className="bg-brand-700 px-10 py-3 rounded-full shadow-lg"
                      >
                        <Text className="text-lg font-bold text-white">
                          Get Started
                        </Text>
                      </Pressable>
                    </Box>
                  </Box>
                )}
              </Box>
            </ImageBackground>
          ))}
        </AnimatedScrollView>

        <Box className="absolute bottom-[80px] left-0 right-0 flex-row justify-center">
          {slides.map((_, i) => (
            <View
              key={i}
              className={`h-2.5 mx-1 rounded-full border border-brand-700 ${
                index === i ? "w-8 bg-brand-700" : "w-8 bg-brand-200/50"
              }`}
            />
          ))}
        </Box>

        <Box className="absolute bottom-10 left-0 right-0 flex-row items-center justify-between px-8">
          <Pressable
            onPress={handlePrev}
            disabled={index === 0}
            className="w-12 h-12 rounded-full items-center justify-center border border-brand-700"
            style={{ opacity: index === 0 ? 0 : 1 }}
          >
            <ChevronLeft size={20} color="#16A8E3" />
          </Pressable>

          <Pressable
            onPress={handleNext}
            disabled={index === slides.length - 1}
            className="w-12 h-12 rounded-full items-center justify-center border border-brand-700"
            style={{ opacity: index === slides.length - 1 ? 0 : 1 }}
          >
            <ChevronRight size={20} color="#16A8E3" />{" "}
          </Pressable>
        </Box>
      </Box>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  slide: { width, height },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
  },
  topButton: { padding: 10 },
});
