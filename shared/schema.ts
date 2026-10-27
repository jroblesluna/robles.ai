import { z } from "zod";
import { isDisposableEmailDomain } from "./disposableEmailDomains";

export const insertContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  subject: z.string().min(1),
  message: z.string().min(5, "Message must be at least 5 characters long"),
  newsletter: z.boolean().optional().default(false),
  // Validated loosely here; the server re-normalises it with normalizeAttribution().
  attribution: z.unknown().optional(),
  // Clarity user/session IDs for the recording link; re-validated with normalizeClaritySession().
  clarity: z.unknown().optional(),
});

export type InsertContact = z.infer<typeof insertContactSchema>;

export const insertQuizLeadSchema = z.object({
  name: z.string().min(1),
  email: z
    .string()
    .email("Please enter a valid email address")
    .refine((email) => !isDisposableEmailDomain(email), {
      message: "Please use a permanent email address, not a temporary/disposable one",
    }),
  company: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  answers: z.record(z.string(), z.string()),
  score: z.number().min(0).max(100),
  profile: z.string().min(1),
  recommendedServices: z.array(z.string()).min(1),
  locale: z.enum(["es", "en"]).default("es"),
});

export type InsertQuizLead = z.infer<typeof insertQuizLeadSchema>;
