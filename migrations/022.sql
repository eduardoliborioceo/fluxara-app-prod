-- Adiciona finalidade opcional às contas bancárias
-- Run: psql $DATABASE_URL -f migrations/022.sql

ALTER TABLE contas_bancarias
    ADD COLUMN IF NOT EXISTS finalidade VARCHAR(100) DEFAULT NULL;
