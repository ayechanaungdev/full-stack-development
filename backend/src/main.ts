import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // We use NestFactory to create an application instance using our Root Module
  const app = await NestFactory.create(AppModule);

  // Activate global ValidationPipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away any extra properties not defined in the DTO
  }));

  // Tell the server to listen on port 3000
  await app.listen(3000);
  console.log('Server is running on http://localhost:3000');
}

bootstrap();
