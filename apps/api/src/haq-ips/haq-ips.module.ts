import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HaqIpsController } from './haq-ips.controller';
import { HaqIpsService } from './haq-ips.service';

@Module({ imports: [AuthModule], controllers: [HaqIpsController], providers: [HaqIpsService] })
export class HaqIpsModule {}
