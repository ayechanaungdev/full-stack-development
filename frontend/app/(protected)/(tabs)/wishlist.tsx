import CarCard from "@/components/CarCard";
import { Spinner } from "@/components/ui/spinner";
import { useWishlist } from "@/hooks/useWishlist";

import EmptyState from "@/components/EmptyState";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/store/useToastStore";
import { Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity, View } from "react-native";

export default function WishlistScreen() {
  const {
    wishlist,
    wishlistCars,
    toggleWishlist,
    refetch: refetchWishlist,
    loadMore,
    loadingMore,
    hasMore,
  } = useWishlist();
  const [searchQuery, setSearchQuery] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchWishlist();
    setRefreshing(false);
  };

  const router = useRouter();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);

  const {
    visible: toastVisible,
    message: toastMessage,
    type: toastType,
    showToast,
    hideToast,
  } = useToastStore();

  const handleDelete = async (carId: string) => {
    try {
      await toggleWishlist(carId);
      showToast("Removed from wishlist", "success");
    } catch (err) {
      console.error(err);
    }
  };

  const filteredWishlistCars = wishlistCars.filter((car) => {
    const query = searchQuery.toLowerCase().trim();

    return (
      car.brand?.toLowerCase().includes(query) ||
      car.model?.toLowerCase().includes(query) ||
      car.car_type?.toLowerCase().includes(query) ||
      car.location?.toLowerCase().includes(query) ||
      car.seats?.toString().includes(query)
    );
  });

  if (loadingMore && wishlistCars.length === 0) {
    return <Spinner className="mt-10 self-center" />;
  }

  return (
    <>
      <View className="flex-1 px-0 bg-brand-0">
        <GlobalSearchBar
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
          }}
          placeholder="Search by Car's Model, Brand and Capacity ..."
        />
        <Text className="text-[14px] text-typography-black font-regular pt-1 px-4 ">
          <Text className="text-brand-850 font-semibold">
            {filteredWishlistCars.length}
          </Text>{" "}
          out of{" "}
          <Text className="text-brand-850 font-semibold">
            {wishlist.length}
          </Text>{" "}
          Cars Showing
        </Text>

        {filteredWishlistCars.length === 0 ? (
          <EmptyState
            icon={(props) => <Octicons name="bookmark-slash" {...props} />}
            message={
              searchQuery
                ? "No cars match your search"
                : "No wishlist items yet"
            }
          />
        ) : (
          <>
            <FlatList
              key={scrollKey}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#16a8e3"]} // brand-700
                  tintColor="#16a8e3"
                />
              }
              onScroll={(e) => {
                const offset = e.nativeEvent.contentOffset.y;
                setShowScrollTop(offset > 150);
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingBottom: 120,
                paddingHorizontal: 12,
                paddingTop: 12,
              }}
              data={filteredWishlistCars}
              keyExtractor={(item) => item.id}
              numColumns={1}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <CarCard
                  car={item}
                  isGrid={false}
                  wishlist={wishlist.map((w) => w.car_id)}
                  toggleWishlist={() => handleDelete(item.id)}
                  onPress={() => router.push(`/car/${item.id}`)}
                />
              )}
              ListFooterComponent={
                loadingMore ? (
                  <Spinner className="my-4 self-center" />
                ) : !hasMore && wishlist.length > 0 ? (
                  <Text className="text-center text-gray-500 my-4">
                    No more records
                  </Text>
                ) : null
              }
            />

            {showScrollTop && (
              <TouchableOpacity
                onPress={() => setScrollKey((prev) => prev + 1)}
                className="absolute bottom-6 right-6 p-3 rounded-full bg-brand-800"
              >
                <ChevronUp size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </>
  );
}
