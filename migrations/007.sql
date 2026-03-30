CREATE TABLE IF NOT EXISTS ouvidoria_tickets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo        VARCHAR(30) NOT NULL CHECK (tipo IN ('reclamacao','sugestao','elogio','denuncia','solicitacao')),
    mensagem    TEXT NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pendente',
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_suporte (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remetente   VARCHAR(15) NOT NULL CHECK (remetente IN ('user','especialista')),
    mensagem    TEXT NOT NULL,
    lido        BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ouvidoria_user ON ouvidoria_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_suporte_user ON chat_suporte(user_id, criado_em DESC);
