CREATE TABLE IF NOT EXISTS saude_treino_itens (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    data          DATE NOT NULL DEFAULT CURRENT_DATE,
    grupo         VARCHAR(50) NOT NULL,
    exercicio     VARCHAR(100) NOT NULL,
    reps          SMALLINT,
    peso_kg       NUMERIC(5, 2),
    duracao_seg   INTEGER,
    observacao    TEXT,
    registrado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treino_itens_user_data
    ON saude_treino_itens (user_id, data DESC);
