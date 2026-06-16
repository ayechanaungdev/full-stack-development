import { create } from "zustand";

export interface WishlistItem {
  car_id: string;
  created_at: string;
}

interface WishlistStore {
  wishlist: WishlistItem[];
  wishlistCars: any[];

  setWishlist: (items: WishlistItem[]) => void;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (carId: string) => void;
  appendWishlist: (items: WishlistItem[]) => void;
  clearWishlist: () => void;

  setWishlistCars: (cars: any[]) => void;
  appendWishlistCars: (cars: any[]) => void;
  removeWishlistCar: (carId: string) => void;
}

export const useWishlistStore = create<WishlistStore>((set) => ({
  wishlist: [],
  wishlistCars: [],

  setWishlist: (items) =>
    set({
      wishlist: items,
    }),

  addToWishlist: (item) =>
    set((state) => ({
      wishlist: [item, ...state.wishlist],
    })),

  removeFromWishlist: (carId) =>
    set((state) => ({
      wishlist: state.wishlist.filter((w) => w.car_id !== carId),
    })),

  appendWishlist: (items) =>
    set((state) => ({
      wishlist: [...state.wishlist, ...items],
    })),

  clearWishlist: () =>
    set({
      wishlist: [],
      wishlistCars: [],
    }),

  setWishlistCars: (cars) =>
    set({
      wishlistCars: cars,
    }),

  appendWishlistCars: (cars) =>
    set((state) => {
      const map = new Map(
        state.wishlistCars.map((car) => [car.id, car])
      );

      cars.forEach((car) => {
        map.set(car.id, car);
      });

      return {
        wishlistCars: Array.from(map.values()),
      };
    }),

  removeWishlistCar: (carId) =>
    set((state) => ({
      wishlistCars: state.wishlistCars.filter(
        (car) => car.id !== carId
      ),
    })),
}));