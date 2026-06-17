import React from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  icon: React.ElementType;
  message: string;
  iconSize?: number;
  iconColor?: string;
  containerClassName?: string;
  textClassName?: string;
}

export default function EmptyState({
  icon: Icon,
  message,
  iconSize = 48,
  iconColor = '#d1d5db',
  containerClassName = 'flex-1 justify-center items-center mt-20',
  textClassName = 'text-gray-400 mt-4 text-base',
}: EmptyStateProps) {
  return (
    <View className={containerClassName}>
      <Icon size={iconSize} color={iconColor} />
      <Text className={textClassName}>{message}</Text>
    </View>
  );
}
