import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class UploadsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async uploadFromBase64(
    filename: string,
    base64: string,
    contentType?: string,
    bucket?: string,
  ) {
    // Remove data:*/*;base64, prefix if present
    const commaIndex = base64.indexOf(',');
    const raw = commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
    const buffer = Buffer.from(raw, 'base64');

    return this.firebaseService.uploadFile(
      filename,
      buffer,
      contentType,
      bucket,
    );
  }
}
