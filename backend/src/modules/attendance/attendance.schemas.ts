import { z } from "zod";

export const ticketIdSchema = z.uuid();
export const organizerSessionSchema = z.object({ eventoId: z.uuid(), sessaoId: z.uuid() });
export const checkinInputSchema = z.string().min(100).max(150);
