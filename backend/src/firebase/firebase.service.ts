import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    try {
      // serviceAccountKey.json ဖိုင်တည်ရှိရာလမ်းကြောင်းကို ယူပါမယ်
      const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      const serviceAccount = require(serviceAccountPath);

      // Firebase App ကို Initialize မလုပ်ရသေးရင် လုပ်ပါမယ်
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized successfully. 🚀');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK ❌', error);
    }
  }

  // Notification ပို့မယ့် Method
  async sendPushNotification(token: string, title: string, body: string, data?: any) {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: token, // ဘယ်ဖုန်းကို ပို့မလဲဆိုတဲ့ FCM Token
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Successfully sent message: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Error sending push notification', error);
      // တမင် throw မလုပ်ဘဲ ထားခဲ့လို့ရပါတယ်၊ သို့မှသာ notification မရောက်လို့ Booking ပျက်သွားတာမျိုး မဖြစ်မှာပါ
    }
  }
}
