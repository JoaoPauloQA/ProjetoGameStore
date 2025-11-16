-- Consolidated schema for ProjetoGameStore
-- This file brings together the base objects created by setup scripts.

-- Users table
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  nome_completo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS jogos (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  platforms TEXT[],
  image TEXT,
  plays INT DEFAULT 0
);

-- Legacy purchases
CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id),
  jogo_id INT NOT NULL REFERENCES jogos(id),
  preco NUMERIC(10,2) NOT NULL,
  data_compra TIMESTAMP DEFAULT NOW()
);

-- Orders aggregate
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES usuarios(id),
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  game_id INT NOT NULL REFERENCES jogos(id),
  quantity INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
