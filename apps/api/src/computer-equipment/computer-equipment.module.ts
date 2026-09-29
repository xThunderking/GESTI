import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ComputerEquipmentController } from './computer-equipment.controller';
import { ComputerEquipmentService } from './computer-equipment.service';

@Module({
  imports: [AuthModule],
  controllers: [ComputerEquipmentController],
  providers: [ComputerEquipmentService],
})
export class ComputerEquipmentModule {}
