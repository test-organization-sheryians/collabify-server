import { z } from "zod";

export const UserEventDataSchema = z.object({
  id: z.string(),
  email_addresses: z.array(
    z.object({
      id: z.string(),
      email_address: z.string().email(),
      verification: z
        .object({
          status: z.string(),
          strategy: z.string(),
        })
        .nullable(),
    })
  ),
  primary_email_address_id: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  image_url: z.string().nullable().or(z.string()),
});

export const UserCreatedPayloadSchema = z.object({
  type: z.literal("user.created"),
  data: UserEventDataSchema,
});

export const UserUpdatedPayloadSchema = z.object({
  type: z.literal("user.updated"),
  data: UserEventDataSchema,
});

export const UserDeletedPayloadSchema = z.object({
  type: z.literal("user.deleted"),
  data: z.object({
    id: z.string(),
    deleted: z.boolean(),
    object: z.literal("user"),
  }),
});

export type UserCreatedPayload = z.infer<typeof UserCreatedPayloadSchema>;
export type UserUpdatedPayload = z.infer<typeof UserUpdatedPayloadSchema>;
export type UserDeletedPayload = z.infer<typeof UserDeletedPayloadSchema>;

export type ClerkWebhookPayload =
  | UserCreatedPayload
  | UserUpdatedPayload
  | UserDeletedPayload;