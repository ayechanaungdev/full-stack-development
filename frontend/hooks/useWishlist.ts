import apiClient from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";
import { useWishlistStore, WishlistItem } from "@/store/useWishlistStore";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCarRatings } from "./useSearchCar";

const LIMIT = 10;

export const useWishlist = () => {
  const {
    wishlist,
    wishlistCars,
    setWishlist,
    addToWishlist,
    removeFromWishlist,
    appendWishlistCars,
    removeWishlistCar,
    setWishlistCars,
  } = useWishlistStore();

  const authUser = useAuthStore((s) => s.user);
  const userId = authUser?.id ?? null;

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);

  const fetchWishlistCars = useCallback(async (pageNum: number, replace = false) => {
    if (!userId || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);

    try {
      const res = await apiClient.get("/wishlist", {
        params: { page: pageNum, limit: LIMIT },
      });
      const { data, total: totalCount } = res.data;
      setTotal(totalCount);

      const items = (data || []).map((item: any) => ({
        car_id: String(item.car_id),
        created_at: item.created_at,
      }));

      const cars = (data || []).map((item: any) => ({
        ...item.car,
        id: String(item.car.id ?? item.car_id),
        price_per_day: item.car.pricePerDay,
        car_images: item.car.carImages ?? [],
      }));
      const formatted = formatCarRatings(cars);

      if (replace) {
        setWishlistCars(formatted);
      } else {
        appendWishlistCars(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [userId, appendWishlistCars, setWishlistCars]);

  const fetchAllWishlistIds = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiClient.get("/wishlist", {
        params: { page: 1, limit: 100 },
      });
      const { data } = res.data;
      const items = (data || []).map((item: any) => ({
        car_id: String(item.car_id),
        created_at: item.created_at,
      }));
      setWishlist(items);
    } catch (err) {
      console.error(err);
    }
  }, [userId, setWishlist]);

  useEffect(() => {
    if (userId) {
      setPage(1);
      fetchAllWishlistIds();
      fetchWishlistCars(1, true);
    }
  }, [userId, fetchAllWishlistIds, fetchWishlistCars]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingRef.current) return;
    const nextPage = page + 1;
    const loaded = nextPage * LIMIT;
    if (total > 0 && loaded > total) return;
    setPage(nextPage);
    await fetchWishlistCars(nextPage, false);
  }, [userId, page, total, fetchWishlistCars]);

  const toggleWishlist = useCallback(
    async (carId: string) => {
      if (!userId) return;

      const isFavorited = wishlist.some(
        (w) => String(w.car_id) === String(carId),
      );

      if (isFavorited) {
        removeFromWishlist(carId);
        removeWishlistCar(carId);
      } else {
        addToWishlist({
          car_id: carId,
          created_at: new Date().toISOString(),
        });
      }

      try {
        if (isFavorited) {
          await apiClient.delete(`/wishlist/${carId}`);
        } else {
          await apiClient.post(`/wishlist/${carId}`);
        }
        setPage(1);
        await Promise.all([
          fetchAllWishlistIds(),
          fetchWishlistCars(1, true),
        ]);
      } catch (err) {
        console.error(err);
        if (isFavorited) {
          addToWishlist({
            car_id: carId,
            created_at: new Date().toISOString(),
          });
        } else {
          removeFromWishlist(carId);
        }
      }
    },
    [
      userId,
      wishlist,
      removeFromWishlist,
      removeWishlistCar,
      addToWishlist,
      fetchAllWishlistIds,
      fetchWishlistCars,
    ],
  );

  const refetch = useCallback(async () => {
    if (!userId) return;
    setPage(1);
    await Promise.all([
      fetchAllWishlistIds(),
      fetchWishlistCars(1, true),
    ]);
  }, [userId, fetchAllWishlistIds, fetchWishlistCars]);

  const hasMore = total > 0 && page * LIMIT < total;

  return {
    wishlist,
    wishlistCars,
    toggleWishlist,
    loadMore,
    refetch,
    loadingMore,
    hasMore,
  };
};
