import townshipData from "@/constants/yangon-townships.json";
import tailwindConfig from "@/tailwind.config";
import { Alert, Dimensions, Platform, ToastAndroid } from "react-native";
import resolveConfig from "tailwindcss/resolveConfig";

const { width: SW } = Dimensions.get("window");

export const LAST_SEARCH_LOCATION_KEY = "renter_last_search_location";
export const DEFAULT_SEARCH_LOCATION = "11201";

export const getTownshipName = (code: string | undefined): string => {
  if (!code) return "Select Location";
  const match = townshipData.find((item) => item.postalCode === code);
  return match ? `${match.name} Township` : "Unknown Location";
};

export const isoDate = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

export const fmtDisplay = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

export const fmtShortDate = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = months[parseInt(m, 10) - 1];
  return `${parseInt(d, 10)} ${monthName}`;
};
export const fmtInput = (iso: string): string => {
  const [y, m, day] = iso.split("-");
  return `${day}-${m}-${y}`;
};

export const isoToDate = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export const dateToIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const showToast = (msg: string) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert("", msg);
};

export const daysBetween = (s: string, e: string): number =>
  Math.max(
    1,
    Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86_400_000),
  );

export const CARD_WIDTH = SW * 0.7;
export const CARD_GAP = 16;
export const CARD_STEP = CARD_WIDTH + CARD_GAP;

export const CARD_HEIGHT = 320;
export const STATUS_STYLE: Record<string, { pill: string; label: string }> = {
  approved: { pill: "bg-info-0", label: "text-info-700" },
  pending: { pill: "bg-warning-0", label: "text-warning-700" },
  rejected: { pill: "bg-error-50", label: "text-error-800" },
  completed: { pill: "bg-success-0", label: "text-success-700" },
  cancelled: { pill: "bg-error-0" , label: "text-error-700"}
};

export const getStatusStyle = (s: string) =>
  STATUS_STYLE[s?.toLowerCase()] ?? STATUS_STYLE.completed;

export const townshipLocationOptions = townshipData.map((t) => ({
  label: t.name,
  value: t.postalCode,
}));

// --- THEME & STYLING CONFIG ---
const fullConfig = resolveConfig(tailwindConfig) as any;
export const brand = fullConfig.theme.colors.brand;
export const CARD_SHADOW = {
  shadowColor: brand[925],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 12,
  elevation: 4,
};

export const getCarImageSource = (url?: string) => {
  return url 
    ? { uri: url } 
    : require("@/assets/images/icon.png");
};

export const truncate = (text: string | null | undefined, limit: number) => {
  if (!text) return "—";
  return text.length > limit ? `${text.substring(0, limit)}...` : text;
}