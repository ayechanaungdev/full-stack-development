import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule], // Allow database operations
    controllers: [ChatController],
    providers: [ChatService, ChatGateway],
    exports: [ChatService], // Export so other modules (like notifications) can use it later
})
export class ChatModule { }
