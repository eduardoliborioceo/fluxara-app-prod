-- Performance indexes for high-frequency query patterns
-- Safe to run multiple times (CREATE INDEX IF NOT EXISTS)

-- lancamentos: balance calculation per conta
CREATE INDEX IF NOT EXISTS idx_lancamentos_conta_tipo
    ON lancamentos (conta_id, tipo, ativo, efetivado);

-- lancamentos: fatura lookups per cartao
CREATE INDEX IF NOT EXISTS idx_lancamentos_cartao_fatura
    ON lancamentos (cartao_id, fatura_mes, fatura_ano, ativo);

-- lancamentos: budget/planning queries (month/year + user)
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_periodo
    ON lancamentos (user_id, ativo, data_vencimento);

-- transferencias: balance per conta (origem and destino)
CREATE INDEX IF NOT EXISTS idx_transferencias_origem
    ON transferencias (conta_origem_id, ativo);

CREATE INDEX IF NOT EXISTS idx_transferencias_destino
    ON transferencias (conta_destino_id, ativo);

-- push subscriptions: already have endpoint unique, but user_id lookup is frequent
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
    ON push_subscriptions (user_id);

-- saude_push_sent: dedup lookup
CREATE INDEX IF NOT EXISTS idx_saude_push_sent_lookup
    ON saude_push_sent (user_id, tipo, referencia);
