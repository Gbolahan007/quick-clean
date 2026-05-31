import { z } from "zod";

const VALID_FREQUENCIES = [
  "one-time",
  "weekly",
  "biweekly",
  "monthly",
] as const;
const VALID_SERVICE_TYPES = ["maintenance", "deep"] as const;

export const bookingSubmitSchema = z.object({
  // Customer
  firstName: z.string().min(2),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),

  // Address
  streetAddress: z.string().min(1),
  apartmentNumber: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  squareMeters: z.number().int().positive(),
  numberOfRooms: z.number().int().positive(),
  accessInstructions: z.string().optional(),

  // Schedule
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  timeSlot: z.string().min(1, "Time slot required"),
  // slotId used for server-side re-validation — prevents overbooking
  slotId: z.string().uuid("Invalid slot ID"),

  // Service
  serviceType: z.enum(VALID_SERVICE_TYPES),
  planKey: z.string().min(1),
  planLabel: z.string().min(1),
  frequency: z.enum(VALID_FREQUENCIES),
  showDeducted: z.boolean(),
  basePrice: z.number().nonnegative(),
  finalPrice: z.number().positive(),

  // Apartment
  apartmentKey: z.string().min(1),
  apartmentLabel: z.string().min(1),
  apartmentSize: z.string().min(1),

  // Addons
  addonsSnapshot: z.object({
    count: z.number().int().nonnegative(),
    rawTotal: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    discountedTotal: z.number().nonnegative(),
    names: z.array(z.string()),
  }),

  // Notes
  specialNotes: z.string(),
  locale: z.enum(["en", "fi"]).optional(),
});

export type BookingSubmitSchema = z.infer<typeof bookingSubmitSchema>;
