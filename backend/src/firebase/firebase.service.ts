import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    try {
      const serviceAccountPath = path.resolve(
        process.cwd(),
        'serviceAccountKey.json',
      );
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      const serviceAccount = require(serviceAccountPath);

      if (!admin.apps.length) {
        const storageBucket = `${(serviceAccount as { project_id: string }).project_id}.appspot.com`;
        admin.initializeApp({
          credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount,
          ),
          storageBucket,
        });
        this.logger.log(
          `Firebase Admin SDK initialized successfully. 🚀 Bucket: ${storageBucket}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK ❌', error);
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<any> {
    try {
      if (token.startsWith('ExponentPushToken')) {
        return await this.sendExpoPush(token, title, body, data);
      }
      const message: admin.messaging.Message = {
        notification: { title, body },
        data: data || {},
        token,
      };
      const response = await admin.messaging().send(message);
      this.logger.log(`Successfully sent FCM message: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Error sending push notification', error);
    }
  }

  private async sendExpoPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const message = {
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high' as const,
    };
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await response.json();
    this.logger.log(`Expo push result: ${JSON.stringify(result)}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  }

  // Upload a file buffer to Firebase Storage
  async uploadFile(
    filePath: string,
    buffer: Buffer,
    contentType?: string,
    bucketName?: string,
  ) {
    try {
      const bucket = bucketName
        ? admin.storage().bucket(bucketName)
        : admin.storage().bucket();
      const file = bucket.file(filePath);

      await file.save(buffer, {
        metadata: {
          contentType: contentType || 'application/octet-stream',
        },
        resumable: false,
      });

      // Try to make public, but don't fail if bucket uses uniform access
      try {
        await file.makePublic();
      } catch (publicErr: unknown) {
        this.logger.warn(
          `makePublic failed (bucket may use uniform access): ${(publicErr as Error)?.message}`,
        );
      }

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      this.logger.log(`Uploaded file to ${publicUrl}`);
      return { publicUrl };
    } catch (error: unknown) {
      this.logger.error('Error uploading file to Firebase Storage', error);
      throw new Error(`Firebase upload failed: ${(error as Error)?.message}`);
    }
  }

  // Generate a signed upload URL (PUT) for direct client uploads
  async getSignedUploadUrl(
    filePath: string,
    expiresInSeconds = 60 * 5,
    contentType?: string,
    bucketName?: string,
  ) {
    try {
      const bucket = bucketName
        ? admin.storage().bucket(bucketName)
        : admin.storage().bucket();
      const file = bucket.file(filePath);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresInSeconds * 1000,
        contentType: contentType || 'application/octet-stream',
      });

      // Also compute the public URL where file will be accessible after making public
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

      return { uploadUrl: url, publicUrl };
    } catch (error) {
      this.logger.error('Error generating signed upload URL', error);
      throw error;
    }
  }
}
