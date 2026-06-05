import { z } from 'zod';

const trimmed = (max) => z.string().trim().min(1).max(max);

// Public listing query/filter
export const listingQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  commodity: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  licence: z.string().trim().max(120).optional(),
  status: z.enum(['Live', 'Under offer']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

// "Sell an asset" submission. Mirrors the front-end form + engagement letter.
const dataUrlPng = z
  .string()
  .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'Signature must be a PNG data URL')
  .max(2_000_000);

export const createListingSchema = z.object({
  assetType: trimmed(120),
  commodity: trimmed(80),
  country: trimmed(80),
  location: trimmed(160), // district
  licence: trimmed(120),
  area: z.string().trim().max(60).optional().or(z.literal('')),
  stage: z.string().trim().max(120).optional().or(z.literal('')),
  price: z.string().trim().max(60).optional().or(z.literal('')),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  engagementLetter: z.object({
    accepted: z.literal(true),
    signature: dataUrlPng,
    termsVersion: z.string().trim().max(40).default('2026-05-19'),
  }),
});

// Buyer "Request contact"
export const contactRequestSchema = z.object({
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
});

// Email alert subscription
export const createAlertSchema = z.object({
  email: z.string().trim().email().max(160),
  commodity: z.string().trim().max(80).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  licence: z.string().trim().max(120).optional().or(z.literal('')),
});

// Operator auth
export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
});

export const operatorListingQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(['Pending review', 'Live', 'Under offer', 'Closed', 'Declined', 'All']).default('All'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const declineSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal('')),
});

export const closeSchema = z.object({
  // Optional: override the transaction value used for the fee (defaults to listing price_val).
  transactionValue: z.coerce.number().int().min(0).optional(),
});
