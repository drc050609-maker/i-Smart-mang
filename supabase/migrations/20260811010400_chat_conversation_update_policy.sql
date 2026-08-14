-- Allow conversation updated_at touch from message insert trigger (SECURITY INVOKER).

GRANT UPDATE ON public.chat_conversations TO authenticated;

CREATE POLICY "Participants can update their chat conversations"
  ON public.chat_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
        AND (
          staff_user.role = 'admin'
          OR staff_user.teacher_id = chat_conversations.teacher_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.member_accounts AS member
      WHERE member.id = auth.uid()
        AND member.is_active = true
        AND (
          (member.member_type = 'teacher' AND member.teacher_id = chat_conversations.teacher_id)
          OR (member.member_type = 'student' AND member.student_id = chat_conversations.student_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_accounts AS staff_user
      WHERE staff_user.id = auth.uid()
        AND staff_user.is_active = true
        AND (
          staff_user.role = 'admin'
          OR staff_user.teacher_id = chat_conversations.teacher_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.member_accounts AS member
      WHERE member.id = auth.uid()
        AND member.is_active = true
        AND (
          (member.member_type = 'teacher' AND member.teacher_id = chat_conversations.teacher_id)
          OR (member.member_type = 'student' AND member.student_id = chat_conversations.student_id)
        )
    )
  );
