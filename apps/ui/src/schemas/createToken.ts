import { z } from "zod";

export const TOKEN_SIZES = [0.5, 1, 2, 3, 4] as const;

export const createTokenSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  size: z.union([z.literal(0.5), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  image: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  locked: z.boolean().optional(),
});

export type CreateTokenFormValues = z.infer<typeof createTokenSchema>;
