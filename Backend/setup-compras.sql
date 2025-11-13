-- Criação da tabela de compras
-- Estrutura solicitada: id, usuario_id (FK), jogo_id (FK), preco, data_compra

BEGIN;

-- Tabela compras
CREATE TABLE IF NOT EXISTS compras (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  jogo_id      INTEGER NOT NULL REFERENCES jogos(id)     ON DELETE RESTRICT,
  preco        NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  data_compra  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_compras_usuario   ON compras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_compras_jogo      ON compras(jogo_id);
CREATE INDEX IF NOT EXISTS idx_compras_data      ON compras(data_compra DESC);

COMMIT;

-- Observações:
-- 1) O backend já faz SELECT com alias para os nomes esperados pelo frontend:
--    SELECT c.preco AS valor, c.data_compra AS created_at, ...
-- 2) Se a tabela não existir, o endpoint /api/account/:id retorna purchases = [] silenciosamente.
-- 3) Ajuste ON DELETE conforme sua regra de negócio (RESTRICT/SET NULL/CASCADE) para jogo_id.
