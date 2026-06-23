import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UploadsService {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async uploadFromBase64(
    filename: string,
    base64: string,
    contentType?: string,
    folder?: string,
  ) {
    const commaIndex = base64.indexOf(',');
    const raw = commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
    const buffer = Buffer.from(raw, 'base64');

    return this.cloudinaryService.uploadFile(buffer, {
      folder,
      filename,
      contentType,
    });
  }

  async getSignedUrl(
    filename: string,
    expiresInSeconds?: number,
    contentType?: string,
    folder?: string,
  ) {
    const timestamp = Math.round(Date.now() / 1000) + (expiresInSeconds || 300);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: filename,
        folder: folder || '',
      },
      process.env.CLOUDINARY_API_SECRET as string,
    );

    const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const publicUrl = cloudinary.url(filename, {
      folder: folder || '',
      secure: true,
    });

    return {
      uploadUrl,
      publicUrl,
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder: folder || '',
    };
  }
}
