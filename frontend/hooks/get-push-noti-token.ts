import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});
 
async function registerForPushNotificationsAsync(userId: string) {
 
  try {

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        showBadge: true,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
    
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
 
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
 
    const token = tokenData.data;

    await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('expo_push_token', token);
 
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);
 
    if (error) {
      throw error;
    }
 
  } catch (error) {
    error instanceof Error
  }
}
 
export default registerForPushNotificationsAsync;
