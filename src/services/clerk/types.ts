export type ClerkWebhookEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent;

export interface UserCreatedEvent {
  type: "user.created";
  data: UserEventData;
}

export interface UserUpdatedEvent {
  type: "user.updated";
  data: UserEventData;
}

export interface UserDeletedEvent {
  type: "user.deleted";
  data: {
    id: string;
    deleted: boolean;
    object: "user";
  };
}

export interface UserEventData {
  id: string;
  email_addresses: Array<{
    id: string;
    email_address: string;
    verification: { status: string; strategy: string };
  }>;
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  // Add other fields as needed
}
