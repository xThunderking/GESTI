import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TowerIpsController } from './tower-ips.controller';
import { TowerIpsService } from './tower-ips.service';

@Module({
  imports: [AuthModule],
  controllers: [TowerIpsController],
  providers: [TowerIpsService],
})
export class TowerIpsModule {}
