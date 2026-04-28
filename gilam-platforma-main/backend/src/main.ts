import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env.PORT || '3000', 10);

  // SO_REUSEADDR: TIME_WAIT holatidagi portni ham band qilish imkonini beradi
  const server = app.getHttpServer();
  server.on('listening', () => {
    server.setMaxListeners(20);
  });
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} band! 5 soniyadan keyin urinib ko'riladi...`);
      server.close();
      setTimeout(() => {
        server.listen(port, '0.0.0.0');
      }, 5000);
    }
  });

  // SO_REUSEADDR ni yoqamiz — TIME_WAIT portni qayta ishlatish uchun
  (server as any)._handle && ((server as any)._handle.setSimultaneousAccepts?.(true));

  try {
    await app.listen(port, '0.0.0.0');
    console.log(`Backend ishlayapti: http://localhost:${port}/api`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} dastlab band — 5 soniya kutib urinib koramiz...`);
      await new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          try {
            await app.listen(port, '0.0.0.0');
            console.log(`Backend ishlayapti (retry): http://localhost:${port}/api`);
            resolve();
          } catch (e) { reject(e); }
        }, 5000);
      });
    } else {
      throw err;
    }
  }
}
bootstrap();
