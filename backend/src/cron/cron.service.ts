import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
    // Logger က သာမန် console.log ထက် ပိုပြီး လှပသပ်ရပ်တဲ့ မှတ်တမ်းကို ထုတ်ပေးပါတယ်
    private readonly logger = new Logger(CronService.name);

    constructor(private readonly prisma: PrismaService) { }

    // 👈 EVERY_MINUTE ဆိုတဲ့အတိုင်း စက္ကန့် ၆၀ ပြည့်တိုင်း ဒီ function က သူ့အလိုလို အလုပ်လုပ်ပါမယ်
    @Cron(CronExpression.EVERY_MINUTE)
    async handleAutoCompleteBookings() {
        this.logger.debug('Checking for expired bookings... 🔍');

        // ၁. ယခုလက်ရှိအချိန်ထက် စောနေတဲ့ (ကုန်ဆုံးသွားတဲ့) Booking တွေကို ရှာပါမယ်
        const expiredBookings = await this.prisma.booking.findMany({
            where: {
                endDate: {
                    lt: new Date(), // လက်ရှိအချိန် (Now) ထက် ငယ်သော (Less than) အချိန်
                },
                status: {
                    in: ['PENDING', 'CONFIRMED'], // ပြီးသွားပြီဖြစ်တဲ့ ဟာတွေကိုပဲ ထပ်မရှာအောင်လို့ပါ
                },
            },
        });

        // ၂. တကယ်လို့ အဲ့လို Booking တွေ တွေ့ခဲ့ရင် "COMPLETED" လို့ အလိုအလျောက် ပြောင်းပေးပါမယ်
        if (expiredBookings.length > 0) {
            for (const booking of expiredBookings) {
                await this.prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: 'COMPLETED' },
                });

                this.logger.log(`✅ Booking ID ${booking.id} ကို COMPLETED အဖြစ် ပြောင်းလဲလိုက်ပါပြီ။`);
            }
        }
    }
}
