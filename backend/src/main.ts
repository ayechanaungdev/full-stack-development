import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  // Disable NestJS default body parser and use our own with higher limit (10MB for base64 uploads)
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors();

  // Activate global ValidationPipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Tell the server to listen on port 3000
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}

bootstrap();
