import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailRequestsController } from './email-requests.controller';
import { EmailRequestsService } from './email-requests.service';

@Module({
  imports: [AuthModule],
  controllers: [EmailRequestsController],
  providers: [EmailRequestsService],
})
export class EmailRequestsModule {}
