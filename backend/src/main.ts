import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend - support production URL (Vercel, Railway, etc.)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
      'http://localhost:5176', 'http://localhost:3000',
      // Railway/Vercel domains
      'https://*.vercel.app', 'https://*.railway.app', 'https://*.upstash.io'
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('ACL Platform API')
    .setDescription('API de gestion logistique ACL - Africa Construction Logistics')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentification')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('camions', 'Gestion de la flotte')
    .addTag('chauffeurs', 'Gestion des chauffeurs')
    .addTag('pieces', 'Gestion des pièces et stock')
    .addTag('carburant', 'Gestion du carburant')
    .addTag('transport', 'Bons de transport et location')
    .addTag('gps', 'Tracking GPS')
    .addTag('alertes', 'Système d\'alertes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
