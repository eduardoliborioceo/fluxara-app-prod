CREATE TABLE IF NOT EXISTS lancamentos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    descricao VARCHAR(200),
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    data_vencimento DATE,
    efetivado BOOLEAN NOT NULL DEFAULT FALSE,
    recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    recorrencia_tipo VARCHAR(20),
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    subcategoria_id INTEGER REFERENCES subcategorias(id) ON DELETE SET NULL,
    conta_id INTEGER REFERENCES contas_bancarias(id) ON DELETE SET NULL,
    cartao_id INTEGER REFERENCES cartoes_credito(id) ON DELETE SET NULL,
    fatura_mes INTEGER,
    fatura_ano INTEGER,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transferencias (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    descricao VARCHAR(200),
    valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    data_vencimento DATE,
    efetivado BOOLEAN NOT NULL DEFAULT FALSE,
    recorrente BOOLEAN NOT NULL DEFAULT FALSE,
    recorrencia_tipo VARCHAR(20),
    conta_origem_id INTEGER REFERENCES contas_bancarias(id) ON DELETE SET NULL,
    conta_destino_id INTEGER REFERENCES contas_bancarias(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
