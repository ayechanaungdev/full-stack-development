import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { BookingsRepository } from './bookings.repository';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatGateway } from '../chat/chat.gateway';
import { PrismaService } from '../prisma/prisma.service';

describe('BookingsService', () => {
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: BookingsRepository, useValue: {} },
        { provide: FirebaseService, useValue: { sendPushNotification: jest.fn() } },
        { provide: ChatGateway, useValue: { emitToUser: jest.fn(), emitToMultipleUsers: jest.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
