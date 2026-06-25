import CarCard from "@/components/CarCard";
import EmptyState from "@/components/EmptyState";
import CarBrowseHeader from "@/components/explore/CarBrowseSection";
import CarFilterSection from "@/components/explore/CarFilterCard";
import CarFilterModal from "@/components/explore/CarFilterModal";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import { SelectorModal } from "@/components/SelectorModal";
import Toast from "@/components/Toast";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { formatCarRatings, useSearchCars } from "@/hooks/useSearchCar";
import { useWishlist } from "@/hooks/useWishlist";

import { carService } from "@/lib/serviceAdapters";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronUp } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface CarListItem {
  id: string;
  brand: string;
  model: string;
  price_per_day: number;
  postal_code?: string | number;
  location: string;
  status: string;
  seats: number;
  car_type: string;
  car_images: { image_url: string }[];
  avg_rating?: number;
  review_count?: number;
  car_number?: string;
}
type Township = { name: string; postalCode: string };
export default function ExploreCars() {
  const router = useRouter();

  const {
    cars,
    allCars,
    totalCars,
    setCars,
    loading,
    carTypeFilter,
    seatFilter,
    maxPrice,
    loadMore,
    loadingMore,
    hasMore,
    refetch: refetchCars,
  } = useSearchCars();
  const { wishlist, toggleWishlist } = useWishlist();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [selectedTownship, setSelectedTownship] = useState<Township | null>(
    null,
  );
  const [pickupDate, setPickupDate] = useState<string | undefined>();
  const [returnDate, setReturnDate] = useState<string | undefined>();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minPrice] = useState(0);
  // const [maxPrice] = useState(1000000);
  const [activeCategory, setActiveCategory] = useState("All Cars");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [appliedSeats, setAppliedSeats] = useState<string[]>([]);

  const [isGrid, setIsGrid] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const townships = require("../../../constants/yangon-townships.json");

  type ToastType = "success" | "error" | "info" | "warning";
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("info");

  const { location, startDate, endDate } = useLocalSearchParams<{
    location?: string;
    startDate?: string;
    endDate?: string;
  }>();

  useEffect(() => {
    if (maxPrice) {
      setPriceRange([0, maxPrice]);
    }
  }, [maxPrice]);

  useEffect(() => {
    if (location) {
      const foundTownship = townships.find(
        (t: any) => String(t.postalCode) === String(location),
      );
      if (foundTownship) setSelectedTownship(foundTownship);
    }

    if (startDate) setPickupDate(startDate);
    if (endDate) setReturnDate(endDate);
  }, [location, startDate, endDate, townships]);

  const handleSearch = useCallback(async () => {
    try {
      setIsSearching(true);

      const params: Record<string, any> = {
        status: "Available",
        priceMin: priceRange[0],
        priceMax: priceRange[1],
      };

      if (selectedTownship) {
        params.postal_code = String(selectedTownship.postalCode).trim();
      }

      if (pickupDate && returnDate) {
        params.startDate = pickupDate;
        params.endDate = returnDate;
      }

      const result = await carService.getCars(params);
      const formatted = formatCarRatings(result.data ?? []);
      setCars(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [pickupDate, priceRange, returnDate, selectedTownship, setCars]);

  useEffect(() => {
    if (location || startDate || endDate) {
      handleSearch();
    }
  }, [location, startDate, endDate, handleSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    handleReset();
    await refetchCars();
    setRefreshing(false);
  };

  const handleWishlistPress = async (carId: string) => {
    const isFavorited = wishlist.some(
      (w) => String(w.car_id) === String(carId),
    );

    try {
      await toggleWishlist(carId);

      setToastMessage(
        isFavorited ? "Removed from wishlist" : "Added to wishlist",
      );
      setToastType("success");
      setToastVisible(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = (type: "pickup" | "return", value: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(value);
    selected.setHours(0, 0, 0, 0);

    //  not allow date before today
    if (selected < today) return;

    if (type === "pickup") {
      // If no return date -> auto set
      if (!returnDate) {
        setPickupDate(value);
        setReturnDate(value);
        return;
      }

      const currentReturn = new Date(returnDate);

      // If pickup > return -> reset range
      if (selected > currentReturn) {
        setPickupDate(value);
        setReturnDate(value);
      } else {
        setPickupDate(value);
      }
    }

    // If no pickup date -> auto set
    if (type === "return") {
      if (!pickupDate) {
        setPickupDate(value);
        setReturnDate(value);
        return;
      }

      const currentPickup = new Date(pickupDate);

      if (selected < currentPickup) {
        setPickupDate(value);
        setReturnDate(value);
      } else {
        setReturnDate(value);
      }
    }
  };

  const searchedCars = cars.filter((car) => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return true;

    return (
      car.brand?.toLowerCase().includes(query) ||
      car.model?.toLowerCase().includes(query) ||
      car.seats?.toString().includes(query) ||
      car.car_type?.toLowerCase().includes(query) ||
      car.location?.toLowerCase().includes(query) ||
      car.car_number?.toLowerCase().includes(query)
    );
  });

  const displayedCars = searchedCars.filter((car) => {
    // Car Type
    const typeMatch =
      appliedCategories.length === 0 ||
      appliedCategories.includes("All Cars") ||
      appliedCategories.some(
        (type) => car.car_type?.toLowerCase() === type.toLowerCase(),
      );

    // Seats
    const seatMatch =
      appliedSeats.length === 0 ||
      appliedSeats.some((seat) => car.seats?.toString() === seat.split(" ")[0]);

    return typeMatch && seatMatch;
  });

  const sortedCars = [...displayedCars].sort((a, b) => {
    if (a.avg_rating !== b.avg_rating) {
      return sortOrder === "asc"
        ? (a.avg_rating || 0) - (b.avg_rating || 0)
        : (b.avg_rating || 0) - (a.avg_rating || 0);
    }
    return sortOrder === "asc"
      ? (a.review_count || 0) - (b.review_count || 0)
      : (b.review_count || 0) - (a.review_count || 0);
  });

  const handleReset = () => {
    setSearchQuery("");
    setPriceRange([minPrice, maxPrice]);
    setSelectedTownship(null);
    setActiveCategory("All Cars");
    setSortOrder("desc");
    setPickupDate(undefined);
    setReturnDate(undefined);
    setSelectedCategories([]);
    setAppliedCategories([]);
    setSelectedSeats([]);
    setAppliedSeats([]);
    setCars(allCars);
  };

  const isFilterApplied =
    (appliedCategories.length > 0 && !appliedCategories.includes("All Cars")) ||
    appliedSeats.length > 0;

  const uniqueCars = Array.from(
    new Map(sortedCars.map((car) => [car.id, car])).values(),
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-50" edges={["bottom"]}>
      <ScrollView
        key={scrollKey}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#16a8e3"]} // brand-700
            tintColor="#16a8e3"
          />
        }
        className="bg-brand-0"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setShowScrollTop(y > 150);
          const layoutHeight = e.nativeEvent.layoutMeasurement.height;
          const contentHeight = e.nativeEvent.contentSize.height;

          if (
            contentHeight > layoutHeight &&
            y + layoutHeight >= contentHeight - 200
          ) {
            loadMore();
          }
        }}
      >
        <Box className="px-0 pt-2 pb-10">
          <GlobalSearchBar
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
            }}
            placeholder="Search by Car's Model, Brand, Capacity or Car No. ..."
          />
          <CarFilterSection
            selectedTownship={selectedTownship}
            pickupDate={pickupDate}
            setPickupDate={(date) => handleDateChange("pickup", date)}
            returnDate={returnDate}
            setReturnDate={(date) => handleDateChange("return", date)}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onReset={handleReset}
            onSearch={handleSearch}
            onOpenLocation={() => setIsLocationModalVisible(true)}
          />

          <Divider className="bg-brand-400 h-[0.5px] mx-4 my-4 w-auto" />

          <CarBrowseHeader
            offSetCars={sortedCars.length}
            totalCars={totalCars}
            activeCategory={activeCategory}
            isGrid={isGrid}
            onToggleGrid={() => setIsGrid(!isGrid)}
            sortOrder={sortOrder}
            onChangeSortOrder={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
            onOpenFilter={() => setShowFilterModal(true)}
            isFilterApplied={isFilterApplied}
          />
          <CarFilterModal
            visible={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            categories={carTypeFilter}
            seatFilters={seatFilter}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            selectedSeats={selectedSeats}
            setSelectedSeats={setSelectedSeats}
            onApply={() => {
              setAppliedCategories(selectedCategories);
              setAppliedSeats(selectedSeats);
              setShowFilterModal(false);
            }}
            onReset={() => {
              setSelectedCategories(["All Cars"]);
              setAppliedCategories(["All Cars"]);
              setSelectedSeats([]);
              setAppliedSeats([]);
            }}
          />

          {loading && !loadingMore ? (
            <Spinner className="mt-10 self-center" />
          ) : (
            <Box
              className={`mx-4 flex-row flex-1 ${
                sortedCars.length === 0
                  ? "justify-center items-center min-h-[300px]"
                  : isGrid
                    ? "flex-wrap justify-between"
                    : "flex-col"
              }`}
            >
              {sortedCars.length === 0 ? (
                <EmptyState
                  icon={(props) => (
                    <MaterialCommunityIcons name="car-off" {...props} />
                  )}
                  message={
                    searchQuery
                      ? "No cars match your search"
                      : "There is no car available"
                  }
                />
              ) : (
                uniqueCars.map((car) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    isGrid={isGrid}
                    wishlist={wishlist.map((w) => w.car_id)}
                    toggleWishlist={() => handleWishlistPress(car.id)}
                    onPress={() => router.push(`/(protected)/car/${car.id}`)}
                  />
                ))
              )}
            </Box>
          )}
          {loadingMore ? (
            <Spinner className="my-4 self-center" />
          ) : !hasMore && sortedCars.length > 0 ? (
            <Box className="py-4">
              <Text className="text-center text-gray-400 text-sm">
                No more records
              </Text>
            </Box>
          ) : null}
        </Box>
      </ScrollView>

      {showScrollTop && (
        <TouchableOpacity
          onPress={() => setScrollKey((prev) => prev + 1)}
          className="absolute bottom-16 right-6 p-3 rounded-full bg-brand-800"
        >
          <ChevronUp size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <SelectorModal
        visible={isLocationModalVisible}
        onClose={() => setIsLocationModalVisible(false)}
        title="Select Location"
        options={townships}
        labelField="name"
        onSelect={setSelectedTownship}
      />

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
      {isSearching && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <View className=" items-center">
            <Spinner />
            <Text className="mt-2 text-white text-xl">Searching cars...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
