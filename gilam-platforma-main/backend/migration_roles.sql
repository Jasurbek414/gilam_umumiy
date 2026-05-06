-- Gilam SaaS: Rollar migratsiyasi
-- WASHER -> eski, FINISHER -> eski
-- Yangi: MANAGER, WORKER

-- 1. Enum ga yangi qiymatlar qo'shish
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'WORKER';

-- 2. Yangi ustunlar qo'shish
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(12,2) DEFAULT 0;

-- 3. Eski rollarni yangilarga o'tkazish
UPDATE users SET role = 'WORKER' WHERE role = 'WASHER';
UPDATE users SET role = 'WORKER' WHERE role = 'FINISHER';
