-- Tags: user-defined labels for lancamentos
-- Run on banco_prod via psql before deploying this branch.

CREATE TABLE IF NOT EXISTS tags (
    id       SERIAL PRIMARY KEY,
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome     VARCHAR(30) NOT NULL,
    cor      VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    UNIQUE (user_id, nome)
);

CREATE TABLE IF NOT EXISTS lancamento_tags (
    lancamento_id INTEGER NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
    tag_id        INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (lancamento_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lancamento_tags_lancamento ON lancamento_tags (lancamento_id);
CREATE INDEX IF NOT EXISTS idx_lancamento_tags_tag        ON lancamento_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id               ON tags (user_id);
