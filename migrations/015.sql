CREATE TABLE IF NOT EXISTS assinaturas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plano VARCHAR(50) NOT NULL DEFAULT 'apostas',
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    metodo_pagamento VARCHAR(20),
    valor_usd NUMERIC(10,2) NOT NULL DEFAULT 2.00,
    valor_brl NUMERIC(10,2) NOT NULL DEFAULT 11.40,
    inicio_em TIMESTAMPTZ,
    expira_em TIMESTAMPTZ,
    cancelada_em TIMESTAMPTZ,
    referencia_pagamento VARCHAR(255),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_user_id ON assinaturas(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
