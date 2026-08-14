-- Teacher–student chat for the mobile app; admin console can read for oversight.

CREATE TABLE public.chat_conversations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id bigint NOT NULL REFERENCES public.teachers (id) ON DELETE CASCADE,
  student_id bigint NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_conversations_teacher_student_unique UNIQUE (teacher_id, student_id)
);

CREATE INDEX chat_conversations_teacher_id_idx ON public.chat_conversations (teacher_id);
CREATE INDEX chat_conversations_student_id_idx ON public.chat_conversations (student_id);
CREATE INDEX chat_conversations_updated_at_idx ON public.chat_conversations (updated_at DESC);

COMMENT ON TABLE public.chat_conversations IS 'One thread per teacher–student pair for app messaging.';

CREATE TYPE public.chat_sender_type AS ENUM ('teacher', 'student');

CREATE TABLE public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES public.chat_conversations (id) ON DELETE CASCADE,
  sender_type public.chat_sender_type NOT NULL,
  sender_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_conversation_id_created_at_idx
  ON public.chat_messages (conversation_id, created_at);

COMMENT ON TABLE public.chat_messages IS 'Messages within a teacher–student chat conversation.';

CREATE OR REPLACE FUNCTION public.touch_chat_conversation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_touch_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_chat_conversation_updated_at();

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all chat conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
        AND staff_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
        AND staff_user.role = 'admin'
    )
  );

CREATE POLICY "Teachers can view their chat conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
        AND staff_user.teacher_id = chat_conversations.teacher_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.member_accounts AS member
      WHERE member.id = auth.uid()
        AND member.is_active = true
        AND member.member_type = 'teacher'
        AND member.teacher_id = chat_conversations.teacher_id
    )
  );

CREATE POLICY "Students can view their chat conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.member_accounts AS member
      WHERE member.id = auth.uid()
        AND member.is_active = true
        AND member.member_type = 'student'
        AND member.student_id = chat_conversations.student_id
    )
  );

CREATE POLICY "Participants can view messages in their conversations"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations AS conversation
      WHERE conversation.id = chat_messages.conversation_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.staff_accounts AS staff_user
            WHERE staff_user.id = auth.uid()
              AND staff_user.is_active = true
              AND (
                staff_user.role = 'admin'
                OR staff_user.teacher_id = conversation.teacher_id
              )
          )
          OR EXISTS (
            SELECT 1
            FROM public.member_accounts AS member
            WHERE member.id = auth.uid()
              AND member.is_active = true
              AND (
                (member.member_type = 'teacher' AND member.teacher_id = conversation.teacher_id)
                OR (member.member_type = 'student' AND member.student_id = conversation.student_id)
              )
          )
        )
    )
  );

CREATE POLICY "Teachers and students can create conversations"
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
        AND staff_user.teacher_id = teacher_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.member_accounts AS member
      WHERE member.id = auth.uid()
        AND member.is_active = true
        AND (
          (member.member_type = 'teacher' AND member.teacher_id = teacher_id)
          OR (member.member_type = 'student' AND member.student_id = student_id)
        )
    )
  );

CREATE POLICY "Participants can send chat messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations AS conversation
      WHERE conversation.id = conversation_id
        AND (
          (
            sender_type = 'teacher'
            AND (
              EXISTS (
                SELECT 1
                FROM public.staff_accounts AS staff_user
                WHERE staff_user.id = auth.uid()
                  AND staff_user.is_active = true
                  AND staff_user.teacher_id = conversation.teacher_id
              )
              OR EXISTS (
                SELECT 1
                FROM public.member_accounts AS member
                WHERE member.id = auth.uid()
                  AND member.is_active = true
                  AND member.member_type = 'teacher'
                  AND member.teacher_id = conversation.teacher_id
              )
            )
          )
          OR (
            sender_type = 'student'
            AND EXISTS (
              SELECT 1
              FROM public.member_accounts AS member
              WHERE member.id = auth.uid()
                AND member.is_active = true
                AND member.member_type = 'student'
                AND member.student_id = conversation.student_id
            )
          )
        )
    )
  );

GRANT SELECT, INSERT ON public.chat_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
