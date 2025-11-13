-- Script para criar a tabela de usuários no PostgreSQL
-- Execute este script para adicionar autenticação ao sistema

-- Remove a tabela se já existir (apenas para desenvolvimento)
DROP TABLE IF EXISTS usuarios CASCADE;

-- Cria a tabela de usuários
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  nome_completo VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cria índices para melhorar performance nas consultas
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_email ON usuarios(email);

-- Insere um usuário de teste (senha: 123456)
-- Hash gerado com bcrypt: bcrypt.hash('123456', 10)
INSERT INTO usuarios (username, email, senha_hash, nome_completo) 
VALUES ('admin', 'admin@gamestore.com', '$2b$10$K3khQw8YiGEPx7Gl8H/TSOiZcJQfz0uTKpOqbZ9EcGxZ.ZdxNvXmO', 'Administrador');

-- Visualiza os dados inseridos
SELECT id, username, email, nome_completo, created_at FROM usuarios;
