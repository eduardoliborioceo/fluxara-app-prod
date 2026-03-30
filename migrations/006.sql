CREATE TABLE IF NOT EXISTS notificacoes_orcamento_enviadas (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    mes         INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano         INTEGER NOT NULL CHECK (ano >= 2000),
    limiar      INTEGER NOT NULL CHECK (limiar IN (80, 100)),
    enviado_em  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, categoria_id, mes, ano, limiar)
);

CREATE INDEX IF NOT EXISTS idx_notif_orc_user ON notificacoes_orcamento_enviadas(user_id, mes, ano);
