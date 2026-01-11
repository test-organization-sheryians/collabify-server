-- Function to broadcast
CREATE OR REPLACE FUNCTION notify_new_outbox_event() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('new_outbox_event', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on Insert
DROP TRIGGER IF EXISTS trigger_new_outbox_event ON "notification_outbox";
CREATE TRIGGER trigger_new_outbox_event
AFTER INSERT ON "notification_outbox"
FOR EACH ROW EXECUTE PROCEDURE notify_new_outbox_event();