CREATE TABLE IF NOT EXISTS saude_push_sent (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    tipo       VARCHAR(50) NOT NULL,
    referencia VARCHAR(20) NOT NULL,
    sent_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, tipo, referencia)
);
