-- Apostas tips (recomendações de apostas)
-- Run on banco_prod via psql before deploying.

CREATE TABLE IF NOT EXISTS apostas_tips (
    id           SERIAL PRIMARY KEY,
    titulo       VARCHAR(200) NOT NULL,
    partida      VARCHAR(200),
    campeonato   VARCHAR(100),
    odd          NUMERIC(10, 2),
    stake        VARCHAR(50),
    data_partida DATE,
    status       VARCHAR(20) NOT NULL DEFAULT 'pendente',
    created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    jogos        JSONB NOT NULL DEFAULT '[]'::jsonb,
    link_aposta  TEXT
);

CREATE INDEX IF NOT EXISTS idx_apostas_tips_status ON apostas_tips(status);
CREATE INDEX IF NOT EXISTS idx_apostas_tips_created_at ON apostas_tips(created_at DESC);
