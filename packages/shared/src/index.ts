import { z } from 'zod';

export const ticketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ticketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED',
]);

export const createTicketSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  priority: ticketPrioritySchema.default('MEDIUM'),
  requesterId: z.string().uuid(),
  departmentId: z.string().uuid(),
  assetId: z.string().uuid().optional(),
});

export type TicketPriority = z.infer<typeof ticketPrioritySchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
