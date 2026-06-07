CREATE TABLE IF NOT EXISTS saude_exercicios (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL,
    tipo           VARCHAR(30) NOT NULL DEFAULT 'outro',
    nome           VARCHAR(100) NOT NULL,
    duracao_min    INTEGER,
    calorias_gasto INTEGER,
    intensidade    VARCHAR(20),
    observacao     TEXT,
    registrado_em  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saude_exercicios_user
    ON saude_exercicios (user_id, registrado_em DESC);
