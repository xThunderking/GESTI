import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PrintersModule } from './printers/printers.module';
import { AreasModule } from './areas/areas.module';
import { TowerIpsModule } from './tower-ips/tower-ips.module';
import { EmailRequestsModule } from './email-requests/email-requests.module';
import { TonersModule } from './toners/toners.module';
import { ComputerEquipmentModule } from './computer-equipment/computer-equipment.module';
import { HaqIpsModule } from './haq-ips/haq-ips.module';
import { ExtensionsModule } from './extensions/extensions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PrintersModule,
    AreasModule,
    TowerIpsModule,
    EmailRequestsModule,
    TonersModule,
    ComputerEquipmentModule,
    HaqIpsModule,
    ExtensionsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
