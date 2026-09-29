import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TonersController } from './toners.controller';
import { TonersService } from './toners.service';

@Module({
  imports: [AuthModule],
  controllers: [TonersController],
  providers: [TonersService],
})
export class TonersModule {}
