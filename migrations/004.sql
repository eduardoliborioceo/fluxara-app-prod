ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS grupo_recorrencia_id UUID;

CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo
    ON lancamentos(grupo_recorrencia_id)
    WHERE grupo_recorrencia_id IS NOT NULL;
