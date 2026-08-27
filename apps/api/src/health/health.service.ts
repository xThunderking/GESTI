import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      service: 'gesti-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
