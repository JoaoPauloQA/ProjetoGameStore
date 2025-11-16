-- ========================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DE PEDIDOS
-- ========================================
-- Este script cria as tabelas necessárias para registrar
-- o histórico de compras dos usuários da GameStore
--
-- TABELAS:
-- 1. orders       - Cabeçalho do pedido (dados gerais da compra)
-- 2. order_items  - Itens do pedido (jogos comprados)

BEGIN;

-- ========================================
-- TABELA: orders
-- ========================================
-- Armazena informações gerais de cada pedido/compra
-- Relaciona com a tabela usuarios via user_id
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  total_price  DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Índices para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ========================================
-- TABELA: order_items
-- ========================================
-- Armazena os jogos comprados em cada pedido
-- Relaciona com orders via order_id e com jogos via game_id
CREATE TABLE IF NOT EXISTS order_items (
  id        SERIAL PRIMARY KEY,
  order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  game_id   INTEGER NOT NULL REFERENCES jogos(id) ON DELETE RESTRICT,
  quantity  INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

-- Índices para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_game_id ON order_items(game_id);

COMMIT;

-- ========================================
-- OBSERVAÇÕES IMPORTANTES:
-- ========================================
-- 1. ON DELETE CASCADE em user_id: Se um usuário for excluído, seus pedidos também serão
-- 2. ON DELETE CASCADE em order_id: Se um pedido for excluído, seus itens também serão
-- 3. ON DELETE RESTRICT em game_id: Impede exclusão de jogos que já foram vendidos
-- 4. CHECK constraints garantem valores válidos (preço >= 0, quantidade > 0)
-- 5. Índices otimizam consultas por usuário, data e itens do pedido
-- 6. Todas as tabelas usam SERIAL para auto-incremento do ID
