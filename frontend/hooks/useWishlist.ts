import { supabase } from "@/lib/supabase";
import { useWishlistStore, WishlistItem } from "@/store/useWishlistStore";
import { useEffect, useState } from "react";
import { formatCarRatings } from "./useSearchCar";

const LIMIT = 10;

export const useWishlist = () => {
const {
  wishlist,
  wishlistCars,
  setWishlist,
  addToWishlist,
  removeFromWishlist,
  appendWishlist,
  clearWishlist,
  setWishlistCars,
  appendWishlistCars,
  removeWishlistCar,
} = useWishlistStore();

  const [userId, setUserId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
      getUser();
  }, []);

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);
    await fetchAllWishlistIds(user.id);
    await fetchWishlistCars(user.id, 0, false);
  };

  const fetchAllWishlistIds = async (uid: string) => {
    const { data, error } = await supabase
      .from("wishlist")
      .select("car_id, created_at")
      .eq("customer_id", uid);

    if (error) {
      console.error(error);
      return;
    }

    setWishlist((data || []) as WishlistItem[]);
  };

  const fetchCarsByIds = async (carIds: string[]) => {
    if (!carIds.length) return [];

    const { data, error } = await supabase
      .from("cars")
      .select(`
        id,
        brand,
        model,
        price_per_day,
        seats,
        car_type,
        location,
        status,
        postal_code,
        car_images ( image_url ),
        reviews ( rating )
      `)
      .in("id", carIds);

    if (error) {
      console.error(error);
      return [];
    }

    return formatCarRatings(data || []);
  };

  const fetchWishlistCars = async (
    uid: string,
    currentOffset = 0,
    isLoadMore = false
  ) => {
    if (loadingMore) return;

    setLoadingMore(true);

    const { data, error } = await supabase
      .from("wishlist")
      .select("car_id, created_at")
      .eq("customer_id", uid)
      .order("created_at", { ascending: false })
      .range(currentOffset, currentOffset + LIMIT - 1);

    if (error || !data) {
      console.error(error);
      setLoadingMore(false);
      return;
    }

    const items = data as WishlistItem[];
    const carIds = items.map((w) => w.car_id);
    const cars = await fetchCarsByIds(carIds);

  if (isLoadMore) {
    appendWishlistCars(cars);
  } else {
    setWishlistCars(cars);
  }

    setOffset(currentOffset + items.length);
    setHasMore(items.length === LIMIT);

    setLoadingMore(false);
  };

  const loadMore = async () => {
    if (!userId || loadingMore || !hasMore) return;
    await fetchWishlistCars(userId, offset, true);
  };

  const insertWishlist = async (carId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("wishlist")
      .insert([{ customer_id: userId, car_id: carId }]);

    if (error) throw error;
  };

  const deleteWishlist = async (carId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("customer_id", userId)
      .eq("car_id", carId);

    if (error) throw error;
  };

  const toggleWishlist = async (carId: string) => {
    if (!userId) return;

    const isFavorited = wishlist.some(
      (w) => String(w.car_id) === String(carId)
    );

    // optimistic update
    if (isFavorited) {
      removeFromWishlist(carId);
      removeWishlistCar(carId);
    } else {
      addToWishlist({
        car_id: carId,
        created_at: new Date().toISOString(),
      });

      const cars = await fetchCarsByIds([carId]);

      appendWishlistCars(cars);
    }
    try {
      if (isFavorited) {
        await deleteWishlist(carId);
      } else {
        await insertWishlist(carId);
        await fetchAllWishlistIds(userId);
      }
      await refetch();
    } catch (err) {
      console.error(err);

      // rollback
      if (isFavorited) {
        addToWishlist({
          car_id: carId,
          created_at: new Date().toISOString(),
        });
      } else {
        removeFromWishlist(carId);
      }
    }
  };

  const refetch = async () => {
    if (!userId) return;
    await fetchAllWishlistIds(userId);
    setOffset(0);
    await fetchWishlistCars(userId, 0, false);
  };

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