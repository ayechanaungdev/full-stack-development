import { create } from "zustand";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastState {
    visible: boolean;
    message: string;
    type: ToastType;
    showToast: (message: string, type?: ToastType) => void;
    hideToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
    visible: false,
    message: "",
    type: "info",
    showToast: (message: string, type: ToastType = "info") => {
        set({ visible: true, message, type });
    },
    hideToast: () => set({ visible: false, message: "" }),
}));

export default useToastStore;
