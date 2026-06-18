-- Adiciona coluna aprovada em apostas_tips para controle de publicação
-- Run: psql $DATABASE_URL -f migrations/020.sql

ALTER TABLE apostas_tips
    ADD COLUMN IF NOT EXISTS aprovada BOOLEAN NOT NULL DEFAULT FALSE;
