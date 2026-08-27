import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { TAB_ID_HEADER } from './auth.constants';

export function getTabId(request: Request) {
  const value = request.headers[TAB_ID_HEADER];
  const tabId = Array.isArray(value) ? value[0] : value;

  if (
    !tabId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tabId)
  ) {
    throw new BadRequestException('Falta el identificador valido de la pestana.');
  }

  return tabId;
}
