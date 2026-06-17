import { CarListItem } from "@/app/(protected)/(home)/search";
import { supabase } from "@/lib/supabase";
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

const roundUpToNicePrice = (value: number, step = 1000000) => {
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
      ...car,
      avg_rating: avg,
      review_count: ratings.length,
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

  const fetchTotalCars = useCallback(async () => {
    const { count } = await supabase
      .from("cars")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "Available");

    setTotalCars(count || 0);
  }, []);

  const buildFilterOptions = useCallback((carsData: any[]) => {
    const typesMap = new Map<string, string>();
    const seatsSet = new Set<string>();

    carsData.forEach((car) => {
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
    const { data, error } = await supabase
      .from("cars")
      .select(
        `
        id, brand, model, price_per_day, seats, car_type,
        location, status, car_number, postal_code,
        car_images ( image_url ),
        reviews ( rating )
      `,
      )
      .eq("status", "Available");

    if (error || !data) {
      console.error(error);
      return;
    }

    const formatted = formatCarRatings(data);
    buildFilterOptions(formatted);
  }, [buildFilterOptions]);

  const fetchCars = useCallback(async (currentOffset = 0, isLoadMore = false, usePagination = true) => {
    setLoading(true);

    let query = supabase
      .from("cars")
      .select(
        `
        id, brand, model, price_per_day, seats, car_type,
        location, status, car_number, postal_code,
        car_images ( image_url ),
        reviews ( rating )
      `,
      )
      .eq("status", "Available")
    
    if (usePagination) {
      query = query.range(currentOffset, currentOffset + LIMIT - 1);
    }
    
    const { data, error } = await query;
    setLoading(false);
    if (error || !data) {
      console.error(error);
      return;
    }

    if (data) {
      const formatted = formatCarRatings(data);
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
    }

    setLoading(false);
  }, []);

  const fetchPriceRange = useCallback(async () => {
    const [{ data: minData, error: minError }, { data: maxData, error: maxError }] = await Promise.all([
      supabase
        .from("cars")
        .select("price_per_day")
        .eq("status", "Available")
        .order("price_per_day", { ascending: true })
        .limit(1),
      supabase
        .from("cars")
        .select("price_per_day")
        .eq("status", "Available")
        .order("price_per_day", { ascending: false })
        .limit(1),
    ]);

    if (!minError) {
      setMinPrice(minData?.[0]?.price_per_day ?? 0);
    }

    if (!maxError) {
      const availableMax = maxData?.[0]?.price_per_day ?? 0;
      setMaxPrice(roundUpToNicePrice(availableMax));
    }
  }, []);

  const refetch = useCallback(async () => {
    setOffset(0);
    await Promise.all([
      fetchFilterOptions(),
      fetchCars(0, false, true),
      fetchPriceRange(),
      fetchTotalCars(),
    ]);
  }, [fetchCars, fetchFilterOptions, fetchPriceRange, fetchTotalCars]);

  useEffect(() => {
    fetchFilterOptions();
    fetchCars(0, false);
    fetchPriceRange();
    fetchTotalCars();
  }, [fetchCars, fetchFilterOptions, fetchPriceRange, fetchTotalCars]);

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
    hasMore
  };
};

