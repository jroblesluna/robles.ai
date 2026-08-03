import { z } from "zod";

export const insertContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().nullable().optional(),
  subject: z.string().min(1),
  message: z.string().min(5, "Message must be at least 5 characters long"),
  newsletter: z.boolean().optional().default(false),
});

export type InsertContact = z.infer<typeof insertContactSchema>;
