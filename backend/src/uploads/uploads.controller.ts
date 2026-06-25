import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { GetSignedUrlDto } from './dto/get-signed-url.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload file', description: 'Upload a file as base64 to Cloudinary' })
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
  @ApiOperation({ summary: 'Get signed URL', description: 'Get a signed upload URL for direct file upload' })
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
