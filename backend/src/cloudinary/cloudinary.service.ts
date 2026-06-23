import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  onModuleInit() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    this.logger.log('Cloudinary configured successfully');
  }

  async uploadFile(
    buffer: Buffer,
    options: {
      folder?: string;
      filename?: string;
      contentType?: string;
    } = {},
  ): Promise<{ publicUrl: string; publicId: string }> {
    const publicId = options.filename
      ? options.filename.replace(/\.[^.]+$/, '')
      : undefined;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || '',
          public_id: publicId,
          resource_type: 'auto',
        },
        (error, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else {
            this.logger.log(`Uploaded file to ${result.secure_url}`);
            resolve({ publicUrl: result.secure_url, publicId: result.public_id });
          }
        },
      );
      uploadStream.end(buffer);
    });
  }
}
