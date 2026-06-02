-- Adiciona coluna tipo ao cartoes_credito (credito, debito, credito_debito)
-- Run: psql $DATABASE_URL -f migrations/018.sql

ALTER TABLE cartoes_credito
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'credito'
    CHECK (tipo IN ('credito', 'debito', 'credito_debito'));
