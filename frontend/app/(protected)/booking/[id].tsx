import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

import RenterBookingDetail from '@/components/renter/RenterBookingDetails';
import OwnerBookingDetail from '@/components/owner/OwnerBookingDetails';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams();
  const { role } = useAuthStore();

  if (role === 'car_owner') {
    return <OwnerBookingDetail bookingId={id as string} />;
  }

  return <RenterBookingDetail bookingId={id as string} />;
}