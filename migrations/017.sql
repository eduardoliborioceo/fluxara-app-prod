-- Adiciona colunas jogos e link_aposta à tabela apostas_tips existente.
-- Necessário quando a tabela foi criada antes da migration 014.sql incluir essas colunas.
-- Run: psql $DATABASE_URL -f migrations/017.sql

ALTER TABLE apostas_tips ADD COLUMN IF NOT EXISTS jogos JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE apostas_tips ADD COLUMN IF NOT EXISTS link_aposta TEXT;
