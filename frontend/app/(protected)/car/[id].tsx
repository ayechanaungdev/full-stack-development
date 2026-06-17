import { useAuthStore } from '@/store/useAuthStore';
import { useLocalSearchParams } from 'expo-router';

import OwnerCarDetails from '@/components/owner/OwnerCarDetails';
import RenterCarDetails from '@/components/renter/RenterCarDetails';

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuthStore();

  if (role === 'car_owner') {
    return <OwnerCarDetails carId={id} />;
  }

  return <RenterCarDetails carId={id} />;
}