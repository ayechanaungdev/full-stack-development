import { CarListItem } from "@/app/(protected)/(home)/search";
import { carService } from "@/lib/serviceAdapters";
import { useCallback, useEffect, useState } from "react";

type UseExploreCarsReturn = {
  cars: CarListItem[];
  allCars: CarListItem[];
  totalCars: number;
  setCars: React.Dispatch<React.SetStateAction<CarListItem[]>>;
  loading: boolean;
  carTypeFilter: string[];
  seatFilter: string[];
  minPrice: number;
  maxPrice: number;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
  hasMore: boolean;
};

const LIMIT = 10;

const roundUpToNicePrice = (value: number, step = 50000) => {
  if (!value || value <= 0) return 0;
  return Math.ceil(value / step) * step;
};

export const formatCarRatings = (cars: any[]): CarListItem[] => {
  return cars.map((car: any) => {
    const ratings = car.reviews?.map((r: any) => r.rating) || [];

    const avg =
      ratings.length > 0
        ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        : 0;

    return {
      id: String(car.id),
      brand: car.brand,
      model: car.model,
      price_per_day: car.pricePerDay ?? car.price_per_day,
      postal_code: car.postal_code,
      location: car.location ?? "",
      status: car.status ?? "Available",
      seats: car.seats ?? 0,
      car_type: car.car_type ?? "",
      car_images: car.carImages ?? car.car_images ?? [],
      avg_rating: avg,
      review_count: ratings.length,
      car_number: car.car_number,
    };
  });
};

export const useSearchCars = (): UseExploreCarsReturn => {
  const [totalCars, setTotalCars] = useState(0);
  const [cars, setCars] = useState<CarListItem[]>([]);
  const [allCars, setAllCars] = useState<CarListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [carTypeFilter, setCarTypeFilter] = useState<string[]>([]);
  const [seatFilter, setSeatFilters] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);

  const buildFilterOptions = useCallback((carsData: any[]) => {
    const typesMap = new Map<string, string>();
    const seatsSet = new Set<string>();

    carsData.forEach((car: any) => {
      if (car.seats) {
        seatsSet.add(`${car.seats} Seats`);
      }

      if (car.car_type) {
        const normalized = car.car_type.trim().toLowerCase();

        if (!typesMap.has(normalized)) {
          typesMap.set(
            normalized,
            car.car_type.charAt(0).toUpperCase() +
              car.car_type.slice(1).toLowerCase(),
          );
        }
      }
    });

    const uniqueSeats = Array.from(seatsSet).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10),
    );
    const uniqueTypes = ["All Cars", ...Array.from(typesMap.values()), "Other"];

    setSeatFilters(uniqueSeats);
    setCarTypeFilter(uniqueTypes);
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const result = await carService.getCars({ limit: 200, status: "Available" });
      const formatted = formatCarRatings(result.data ?? []);
      buildFilterOptions(formatted);
    } catch (err) {
      console.error(err);
    }
  }, [buildFilterOptions]);

  const fetchCars = useCallback(async (currentOffset = 0, isLoadMore = false, usePagination = true) => {
    setLoading(true);

    try {
      const result = await carService.getCars({
        page: usePagination ? Math.floor(currentOffset / LIMIT) : 0,
        limit: usePagination ? LIMIT : 200,
        status: "Available",
      });

      const formatted = formatCarRatings(result.data ?? []);

      if (isLoadMore) {
        setCars((prev) => {
          const map = new Map(prev.map((car) => [car.id, car]));
          formatted.forEach((car) => {
            map.set(car.id, car);
          });
          return Array.from(map.values());
        });

        setAllCars((prev) => {
          const map = new Map(prev.map((car) => [car.id, car]));
          formatted.forEach((car) => {
            map.set(car.id, car);
          });
          return Array.from(map.values());
        });
      } else {
        setCars(formatted);
        setAllCars(formatted);
      }

      setOffset(currentOffset + formatted.length);
      setHasMore(formatted.length === LIMIT);

      if (!isLoadMore) {
        setTotalCars(result.total ?? 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPriceRange = useCallback(async () => {
    try {
      const range = await carService.getPriceRange();
      setMinPrice(range.min ?? 0);
      setMaxPrice(roundUpToNicePrice(range.max ?? 0));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const refetch = useCallback(async () => {
    setOffset(0);
    await Promise.all([
      fetchFilterOptions(),
      fetchCars(0, false, true),
      fetchPriceRange(),
    ]);
  }, [fetchCars, fetchFilterOptions, fetchPriceRange]);

  useEffect(() => {
    fetchFilterOptions();
    fetchCars(0, false);
    fetchPriceRange();
  }, [fetchCars, fetchFilterOptions, fetchPriceRange]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchCars(offset, true, true);
    setLoadingMore(false);
  }, [fetchCars, hasMore, loadingMore, offset]);

  return {
    cars,
    allCars,
    totalCars,
    setCars,
    loading,
    carTypeFilter,
    seatFilter,
    minPrice,
    maxPrice,
    refetch,
    loadMore,
    loadingMore,
    hasMore,
  };
};
