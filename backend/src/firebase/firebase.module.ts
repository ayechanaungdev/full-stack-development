import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Global() // Global Module အဖြစ်ကြေငြာထားပါမယ်
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService], // တခြား Module တွေက ယူသုံးနိုင်အောင် Export လုပ်ပါတယ်
})
export class FirebaseModule {}
