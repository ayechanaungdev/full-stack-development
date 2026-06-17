import { useRouter } from "expo-router";
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from "react-native";

export const BackButton = ({ className = "" }) => {
  const router = useRouter();
  const handleBack = () => {
    if (router.canGoBack()) {
      
      router.back();
    } else {
      router.replace('/(protected)/(tabs)/' as any);
    }
  }
  return (
    <TouchableOpacity
      onPress={handleBack}
      className={`p-2 rounded-full border border-brand-700 items-center justify-center ${className}`}
    >
      <ChevronLeft size={24} color="#16a8e3" />
    </TouchableOpacity>
  )
}