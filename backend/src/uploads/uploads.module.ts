import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
