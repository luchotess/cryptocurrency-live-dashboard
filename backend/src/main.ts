import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : false,
    credentials: true,
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📈 WebSocket endpoint: ws://localhost:${port}/ws/quotes`);
  logger.log(`🔍 Health check: http://localhost:${port}/health/live`);
}
bootstrap();
