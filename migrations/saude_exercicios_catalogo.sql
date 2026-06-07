CREATE TABLE IF NOT EXISTS saude_exercicios_catalogo (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL,
    nome           VARCHAR(100) NOT NULL,
    tipo           VARCHAR(30)  NOT NULL DEFAULT 'outro',
    grupo_muscular VARCHAR(50),
    duracao_padrao INTEGER,
    calorias_est   INTEGER,
    criado_em      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ex_catalogo_user
    ON saude_exercicios_catalogo (user_id, nome);
