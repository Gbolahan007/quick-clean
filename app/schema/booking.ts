import { z } from "zod";

// ── Step 1: Contact ───────────────────────────────────────────────────────────

export const contactSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
});

export type ContactSchema = z.infer<typeof contactSchema>;

// ── Step 2: Address ───────────────────────────────────────────────────────────
// squareMeters and numberOfRooms stay as z.number().
// The conversion from string → number is handled in the component via
// register("field", { valueAsNumber: true }) — React Hook Form does the
// cast before Zod ever sees the value, so the types stay clean.

export const addressSchema = z.object({
  streetAddress: z.string().min(1, "Street address is required"),
  apartmentNumber: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().regex(/^\d{5}$/, "Postal code must be 5 digits"),
  squareMeters: z
    .number({ message: "Please enter the apartment size" })
    .int("Must be a whole number")
    .positive("Must be greater than 0"),
  numberOfRooms: z
    .number({ message: "Please enter the number of rooms" })
    .int("Must be a whole number")
    .positive("Must be greater than 0"),
  accessInstructions: z.string().optional(),
});

export type AddressSchema = z.infer<typeof addressSchema>;

// ── Step 3: Schedule ──────────────────────────────────────────────────────────

export const scheduleSchema = z.object({
  bookingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid date"),
  timeSlot: z.string().min(1, "Please select a time slot"),
  slotId: z.string().uuid("Invalid slot reference"),
  slotEndTime: z.string().min(1, "Missing slot end time"),
});

export type ScheduleSchema = z.infer<typeof scheduleSchema>;

// ── Step 4: Notes ─────────────────────────────────────────────────────────────

export const notesSchema = z.object({
  specialInstructions: z.string().optional(),
  hasPets: z.boolean(),
  petDetails: z.string().optional(),
});

export type NotesSchema = z.infer<typeof notesSchema>;
