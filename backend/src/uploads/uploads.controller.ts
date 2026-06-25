import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { GetSignedUrlDto } from './dto/get-signed-url.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  async upload(@Body() body: CreateUploadDto) {
    const { filename, contentBase64, contentType, folder } = body;
    return this.uploadsService.uploadFromBase64(
      filename,
      contentBase64,
      contentType,
      folder,
    );
  }

  @Post('signed-url')
  async signedUrl(@Body() body: GetSignedUrlDto) {
    const { filename, contentType, expiresInSeconds, folder } = body;
    return this.uploadsService.getSignedUrl(
      filename,
      expiresInSeconds,
      contentType,
      folder,
    );
  }
}
