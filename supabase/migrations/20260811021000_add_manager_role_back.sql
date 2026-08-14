-- Managers (campus console) and teachers (app logins) are separate roles.
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'manager';
