-- Rastreamento da regra dos 10%: registra a ação tomada para cada receita
-- Run: psql $DATABASE_URL -f migrations/021.sql

CREATE TABLE IF NOT EXISTS diretrizes_dez_pct (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lancamento_id    INTEGER NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
    acao             VARCHAR(20) NOT NULL CHECK (acao IN ('investido', 'transferido')),
    conta_destino_id INTEGER REFERENCES contas_bancarias(id) ON DELETE SET NULL,
    valor_dez_pct    NUMERIC(12, 2) NOT NULL,
    criado_em        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, lancamento_id)
);

CREATE INDEX IF NOT EXISTS idx_diretrizes_dez_pct_user
    ON diretrizes_dez_pct (user_id);
