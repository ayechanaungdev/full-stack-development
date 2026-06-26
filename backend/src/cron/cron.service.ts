import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class CronService {
  // Logger က သာမန် console.log ထက် ပိုပြီး လှပသပ်ရပ်တဲ့ မှတ်တမ်းကို ထုတ်ပေးပါတယ်
  private readonly logger = new Logger(CronService.name);

  // add FirebaseService (Inject)
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  // 👈 EVERY_MINUTE ဆိုတဲ့အတိုင်း စက္ကန့် ၆၀ ပြည့်တိုင်း ဒီ function က သူ့အလိုလို အလုပ်လုပ်ပါမယ်
  // @Cron(CronExpression.EVERY_MINUTE)
  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoCompleteBookings() {
    this.logger.debug('Checking for expired bookings... 🔍');

    // ၁. ယခုလက်ရှိအချိန်ထက် စောနေတဲ့ (ကုန်ဆုံးသွားတဲ့) Booking တွေကို ရှာပါမယ်
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        endDate: {
          lt: new Date(), // လက်ရှိအချိန် (Now) ထက် ငယ်သော (Less than) အချိန်
        },
        status: {
          in: ['PENDING', 'APPROVED'], // ပြီးသွားပြီဖြစ်တဲ့ ဟာတွေကိုပဲ ထပ်မရှာအောင်လို့ပါ
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

        this.logger.log(
          `✅ Booking ID ${booking.id} ကို COMPLETED အဖြစ် ပြောင်းလဲလိုက်ပါပြီ။`,
        );
      }
    }
  }
  // 👈 ၃။ မနက်ဖြန် ခရီးစဉ်ရှိသူများကို သတိပေးမည့် Cron Job သစ်ကို ထည့်သွင်းပါ
  // စမ်းသပ်ရလွယ်ကူအောင် @Cron(CronExpression.EVERY_MINUTE) ဖြင့် အရင်စမ်းသပ်ပြီးမှ
  // တကယ့် Production တွင် @Cron(CronExpression.EVERY_DAY_AT_8AM) သို့ ပြောင်းလဲပါမည်။
  @Cron(CronExpression.EVERY_MINUTE)
  async handleUpcomingBookingReminders() {
    this.logger.debug('Checking for upcoming bookings tomorrow... 🔍');

    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const upcomingBookings = await this.prisma.booking.findMany({
      where: {
        startDate: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
      include: {
        user: { include: { profile: true } },
        car: { include: { owner: { include: { profile: true } } } },
      },
    });

    for (const booking of upcomingBookings) {
      const alreadySent = await this.prisma.notification.findFirst({
        where: {
          bookingId: booking.id,
          type: `UPCOMING_REMINDER_${booking.status}`,
        },
      });

      if (alreadySent) {
        this.logger.debug(
          `Booking ID ${booking.id} အတွက် သတိပေးချက် ပို့ပြီးသားဖြစ်၍ ကျော်သွားပါမည်။ ⏭️`,
        );
        continue;
      }

      if (booking.status === 'PENDING') {
        const owner = booking.car?.owner;
        if (!owner?.profile?.expo_push_token) {
          this.logger.warn(
            `⚠️ Booking ID ${booking.id} (PENDING) — Owner FCM Token မရှိသဖြင့် Notification မပို့နိုင်ပါ။`,
          );
          continue;
        }
        const title = 'ခရီးစဉ်အတည်ပြုရန် သတိပေးချက် ⚠️';
        const body = `မင်္ဂလာပါ ${owner.name || 'Owner'}၊ မနက်ဖြန်အတွက် ငှားရမ်းမည့်ခရီးစဉ်တစ်ခုသည် PENDING ဖြစ်နေဆဲဖြစ်ပါသဖြင့် အတည်ပြု/ငြင်းပယ်ပေးပါရန် သတိပေးအပ်ပါသည်ခင်ဗျာ။`;

        await this.firebaseService.sendPushNotification(
          owner.profile.expo_push_token,
          title,
          body,
        );

        await this.prisma.notification.create({
          data: {
            title,
            body,
            type: 'UPCOMING_REMINDER_PENDING',
            userId: owner.id,
            bookingId: booking.id,
          },
        });

        this.logger.log(
          `🔔 Booking ID ${booking.id} (PENDING) — Owner ID ${owner.id} ဆီသို့ သတိပေးချက်ပို့ပြီးပါပြီ။`,
        );
      } else if (booking.status === 'APPROVED') {
        if (!booking.user?.profile?.expo_push_token) {
          this.logger.warn(
            `⚠️ Booking ID ${booking.id} (APPROVED) — Renter FCM Token မရှိသဖြင့် Notification မပို့နိုင်ပါ။`,
          );
          continue;
        }
        const title = 'ကားငှားရမ်းမှု သတိပေးချက် 🚗';
        const body = `မင်္ဂလာပါ ${booking.user.name || 'User'}၊ မနက်ဖြန်တွင် သင်ငှားရမ်းထားသည့် ကားခရီးစဉ် စတင်တော့မည်ဖြစ်၍ သတိပေးအပ်ပါသည်ခင်ဗျာ။`;

        await this.firebaseService.sendPushNotification(
          booking.user.profile.expo_push_token,
          title,
          body,
        );

        await this.prisma.notification.create({
          data: {
            title,
            body,
            type: 'UPCOMING_REMINDER_APPROVED',
            userId: booking.userId,
            bookingId: booking.id,
          },
        });

        this.logger.log(
          `🔔 Booking ID ${booking.id} (APPROVED) — Renter ID ${booking.user.id} ဆီသို့ သတိပေးချက်ပို့ပြီးပါပြီ။`,
        );
      }
    }
  }
}
