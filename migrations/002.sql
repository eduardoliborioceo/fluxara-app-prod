CREATE TABLE IF NOT EXISTS contas_bancarias (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    instituicao VARCHAR(80) NOT NULL DEFAULT 'outro',
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cartoes_credito (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    limite NUMERIC(15,2) NOT NULL DEFAULT 0,
    bandeira VARCHAR(30) NOT NULL DEFAULT 'outro',
    conta_id INTEGER REFERENCES contas_bancarias(id) ON DELETE SET NULL,
    dia_fechamento INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31),
    dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
