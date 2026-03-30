CREATE TABLE IF NOT EXISTS orcamentos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL CHECK (ano >= 2000),
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, categoria_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_user_mes
    ON orcamentos(user_id, mes, ano);
