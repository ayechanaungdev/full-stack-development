-- 01. This migration adds a trigger function to handle notifications for booking events.
CREATE OR REPLACE FUNCTION handle_booking_notifications()
RETURNS TRIGGER AS $$
DECLARE
    noti_title TEXT;
    noti_body TEXT;
    target_receiver UUID;
    target_sender UUID;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    IF (TG_OP = 'INSERT') THEN
        target_receiver := NEW.owner_id;
        target_sender := NEW.customer_id;
        noti_title := 'New Booking Request';
        noti_body := 'A customer has requested to book your car.';

    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status = NEW.status) THEN
            RETURN NEW;
        END IF;

        CASE NEW.status
            WHEN 'approved' THEN
                target_receiver := NEW.customer_id;
                target_sender := NEW.owner_id;
                noti_title := 'Booking Approved';
                noti_body := 'Great news! Your booking request has been approved.';

            WHEN 'rejected' THEN
                target_receiver := NEW.customer_id;
                target_sender := NEW.owner_id;
                noti_title := 'Booking Rejected';
                noti_body := 'Sorry, your booking request was declined by the owner.';

            WHEN 'completed' THEN
                target_receiver := NEW.customer_id;
                target_sender := NEW.owner_id;
                noti_title := 'Booking completed';
                noti_body := 'A booking for your vehicle has been completed.';

            WHEN 'cancelled' THEN
              IF (current_user_id = NEW.customer_id) THEN
                    target_receiver := NEW.owner_id;
                    target_sender := NEW.customer_id;
                    noti_title := 'Booking Cancelled By Renter';
                    noti_body := 'The customer has cancelled their booking request.';
                ELSE
                    target_receiver := NEW.customer_id;
                    target_sender := NEW.owner_id;
                    noti_title := 'Booking Cancelled By Owner';
                    noti_body := 'Sorry, your booking has been cancelled by the owner.';
                END IF;
            
            WHEN 'pending' THEN
                target_receiver := NEW.owner_id;
                target_sender := NEW.customer_id;
                noti_title := 'New Booking Request';
                noti_body := 'A customer has requested to book your car.';
            ELSE
                RETURN NEW;
        END CASE;
    END IF;

   IF target_receiver IS NOT NULL AND target_receiver <> target_sender THEN
        
        IF current_user_id IS NOT NULL AND target_receiver = current_user_id THEN
            RETURN NEW;
        END IF;
        INSERT INTO notifications (
            receiver_id,
            sender_id,
            reference_id,
            title,
            body,
            type,
            is_read
        )
        VALUES (
            target_receiver,
            target_sender,
            NEW.id,
            noti_title,
            noti_body,
            'booking',
            false
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_notification ON bookings;
CREATE TRIGGER trigger_booking_notification
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION handle_booking_notifications();

-- 02. This migration adds a trigger function to handle notifications for new chat messages.
CREATE OR REPLACE FUNCTION handle_chat_notifications()

RETURNS TRIGGER AS $$

DECLARE
    sender_name TEXT;
    current_user_id UUID;
BEGIN

     current_user_id := auth.uid();

    IF current_user_id IS NOT NULL AND NEW.receiver_id = current_user_id THEN
        RETURN NEW;
    END IF;

    SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

    INSERT INTO notifications (
        receiver_id,
        sender_id,
        reference_id,
        title,
        body,
        type,
        is_read
    )
    VALUES (
        NEW.receiver_id,
        NEW.sender_id,
        NEW.id,
        'New Message from ' || COALESCE(sender_name, 'Someone'), -- Use || to join strings
        LEFT(NEW.content, 50),
        'message',
        false

    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_chat_notification ON messages;
CREATE TRIGGER trigger_chat_notification
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION handle_chat_notifications();

-- 03. This migration adds a trigger function to handle notifications for new daily reports.
CREATE OR REPLACE FUNCTION handle_daily_report_notifications()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        receiver_id, 
        sender_id, 
        reference_id, 
        title, 
        body, 
        type, 
        is_read
    )
    VALUES (
        NEW.owner_id,        
        NEW.owner_id,       
        NEW.id,              
        'Daily Report Received', 
        'A new daily report has been generated for your car.', 
        'system',           
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_report_noti ON daily_reports;
CREATE TRIGGER trigger_daily_report_noti
AFTER INSERT ON daily_reports
FOR EACH ROW
EXECUTE FUNCTION handle_daily_report_notifications();

-- 04. This migration adds a trigger function to handle notifications for new cars added by owners.
CREATE OR REPLACE FUNCTION public.handle_new_car_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_name TEXT;
BEGIN
  SELECT full_name INTO v_owner_name 
  FROM public.profiles 
  WHERE id = NEW.owner_id;

  IF v_owner_name IS NULL THEN
    v_owner_name := 'Owner';
  END IF;

  INSERT INTO public.notifications (
    id,
    receiver_id,  
    sender_id,     
    reference_id,  
    title,
    body,          
    type,
    is_read,
    created_at
  ) VALUES (
    gen_random_uuid(),
    null,          
    NEW.owner_id,  
    NEW.id,        
    'New Car Added', 
    'A New Car was added by Owner:' || v_owner_name, 
    'admin-car',
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_car_created
  AFTER INSERT ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_car_notification();

-- 05. This migration adds a trigger function to handle notifications for new inquiries submitted by users.
CREATE OR REPLACE FUNCTION public.handle_new_inquiry_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_role TEXT;
BEGIN

  SELECT full_name, role INTO v_user_name, v_role
  FROM public.profiles 
  WHERE id = NEW.submitted_user_id;

  IF v_user_name IS NULL THEN
    v_user_name := 'User';
  END IF;

  IF v_role IS NULL THEN
    v_role := 'User';
  END IF;
  INSERT INTO public.notifications (
    id,
    receiver_id,   
    sender_id,     
    reference_id, 
    title,
    body,       
    type,         
    is_read,
    created_at
  ) VALUES (
    gen_random_uuid(),
    NULL,
    NEW.submitted_user_id,  
    NEW.id,        
    'New Inquiry',
    'New Inquiry was added by ' || v_user_name || ' (' || v_role || ')',
    'admin-inquiry',
    false,
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_inquiry_created
  AFTER INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_inquiry_notification();


--- 06. This migration adds a scheduled function to keep the Supabase project alive by making periodic HTTP requests.
  select cron.schedule(

    'supabase-keep-alive',                     

    '0 0 */3 * *',                             

    $$

    select net.http_get(

        'project URL', 

        headers := jsonb_build_object(

            'apikey', 'publishable key',         

            'Authorization', 'Bearer Token' 

        )

    );

    $$

);

--07. This migration adds a trigger function to handle notifications for changes in car status by admin.
CREATE OR REPLACE FUNCTION handle_car_status_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO notifications (
            id,
            receiver_id,
            sender_id,
            reference_id,
            title,
            body,
            type,
            is_read,
            created_at
        ) VALUES (
            gen_random_uuid(),
            NEW.owner_id,                 
            NULL,                        
            NEW.id, 
            'Admin Changed Car Status',                     
            'Car Status is changed ' || NEW.status || ' By Admin',     
            'owner-car',                 
            FALSE,                        
            NOW()                         
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_car_status_available ON cars;

CREATE TRIGGER tr_car_status_changed
AFTER UPDATE ON cars
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status
    AND auth.uid() IS DISTINCT FROM NEW.owner_id 
)
EXECUTE FUNCTION handle_car_status_notification();

-- 08. This migration adds a trigger function to sync read status across notifications when a booking, message, or daily report is marked as read.
CREATE OR REPLACE FUNCTION sync_all_read_status()
RETURNS TRIGGER AS $$
DECLARE
    target_type TEXT;
BEGIN
    IF (OLD.is_read IS DISTINCT FROM NEW.is_read) AND NEW.is_read = TRUE THEN
        
        IF TG_TABLE_NAME = 'bookings' THEN
            target_type := 'booking';
        ELSIF TG_TABLE_NAME = 'messages' THEN
            target_type := 'message';
        ELSIF TG_TABLE_NAME = 'daily_reports' THEN
            target_type := 'system';
        ELSE
            RETURN NEW;
        END IF;

        UPDATE notifications
        SET is_read = TRUE
        WHERE reference_id = NEW.id    
          AND type = target_type       
          AND is_read = FALSE;        
          
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



DROP TRIGGER IF EXISTS tr_sync_booking_read ON bookings;
CREATE TRIGGER tr_sync_booking_read
AFTER UPDATE ON bookings
FOR EACH ROW
WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = TRUE)
EXECUTE FUNCTION sync_all_read_status();

DROP TRIGGER IF EXISTS tr_sync_message_read ON messages;
CREATE TRIGGER tr_sync_message_read
AFTER UPDATE ON messages
FOR EACH ROW
WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = TRUE)
EXECUTE FUNCTION sync_all_read_status();

DROP TRIGGER IF EXISTS tr_sync_report_read ON daily_reports;
CREATE TRIGGER tr_sync_report_read
AFTER UPDATE ON daily_reports
FOR EACH ROW
WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read AND NEW.is_read = TRUE)
EXECUTE FUNCTION sync_all_read_status();

