import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller() // Base path is '/'
export class AppController {
    // We "Inject" the service here so we can use its logic
    constructor(
        private readonly appService: AppService,
        private readonly prisma: PrismaService,
    ) { }

    @Get() // Handles GET requests to 'http://localhost:3000/'
    getHello(): string {
        return this.appService.getHello();
    }

    // Add a new route for time
    @Get('time') // Handles GET requests to 'http://localhost:3000/time'
    getTime(): string {
        return this.appService.getTime();
    }

    @Get('db-test')
    async testDb() {
        const userCount = await this.prisma.user.count();
        return {
            message: 'Database connection is working!',
            userCount: userCount,
        };
    }
}
