-- Minha Saúde — tabelas necessárias
-- Execute no banco de produção via psql

CREATE TABLE IF NOT EXISTS saude_perfil (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE,
    altura_cm     NUMERIC(5,1),
    peso_atual_kg NUMERIC(5,2),
    peso_meta_kg  NUMERIC(5,2),
    criado_em     TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saude_peso_historico (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    peso_kg      NUMERIC(5,2) NOT NULL,
    registrado_em TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_peso_user ON saude_peso_historico (user_id, registrado_em DESC);

CREATE TABLE IF NOT EXISTS saude_acordei (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    hora_acordou TIMESTAMP NOT NULL,
    criado_em    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_acordei_user ON saude_acordei (user_id, hora_acordou DESC);

CREATE TABLE IF NOT EXISTS saude_refeicoes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    tipo_refeicao   VARCHAR(30) NOT NULL,
    descricao       TEXT,
    calorias        INTEGER,
    proteinas_g     NUMERIC(6,2),
    carboidratos_g  NUMERIC(6,2),
    gorduras_g      NUMERIC(6,2),
    fonte           VARCHAR(20) DEFAULT 'manual',
    registrado_em   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_refeicoes_user ON saude_refeicoes (user_id, registrado_em DESC);

CREATE TABLE IF NOT EXISTS saude_agua (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL,
    quantidade_ml  INTEGER NOT NULL,
    registrado_em  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_agua_user ON saude_agua (user_id, registrado_em DESC);

CREATE TABLE IF NOT EXISTS saude_produtos (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL,
    nome                VARCHAR(200) NOT NULL,
    marca               VARCHAR(100),
    porcao_descricao    TEXT,
    porcao_g            NUMERIC(6,1),
    calorias_por_porcao INTEGER,
    proteinas_g         NUMERIC(6,2),
    carboidratos_g      NUMERIC(6,2),
    gorduras_totais_g   NUMERIC(6,2),
    sodio_mg            NUMERIC(8,1),
    fibras_g            NUMERIC(6,2),
    criado_em           TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saude_produtos_user ON saude_produtos (user_id);
CREATE INDEX IF NOT EXISTS idx_saude_produtos_nome ON saude_produtos (user_id, nome);
