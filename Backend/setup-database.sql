-- Script para criar e popular a tabela de jogos no PostgreSQL
-- Execute este script no seu banco de dados PostgreSQL

-- Remove a tabela se já existir (cuidado em produção!)
DROP TABLE IF EXISTS jogos;

-- Cria a tabela jogos
CREATE TABLE jogos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  platforms TEXT[] NOT NULL,  -- Array de plataformas (pc, ps, xbox, etc)
  image TEXT,                 -- URL da imagem do jogo
  plays INTEGER DEFAULT 0     -- Número de plays/jogadas
);

-- Insere os jogos de exemplo
INSERT INTO jogos (title, price, platforms, image, plays) VALUES
  ('GTA V', 89.90, ARRAY['pc', 'ps', 'xbox'], 'https://s2-techtudo.glbimg.com/Dx-d7zd6abaVIdY1QqGVKl_QvJ4=/0x0:620x349/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_08fbf48bc0524877943fe86e43087e7a/internal_photos/bs/2021/s/i/R6L1HDR3GxheHSo2ECLQ/2013-10-11-grand-theft-auto-5-gta-finais.jpg', 1200000),
  
  ('The Witcher 3', 59.90, ARRAY['pc', 'ps'], 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/ad9240e088f953a84aee814034c50a6a92bf4516/header.jpg?t=1761131270', 890000),
  
  ('Elden Ring', 89.90, ARRAY['pc', 'ps', 'xbox'], 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg', 760000),
  
  ('Skyrim', 70.00, ARRAY['pc', 'ps', 'xbox'], 'https://cdn.cloudflare.steamstatic.com/steam/apps/72850/header.jpg', 430000),
  
  ('Baldur''s Gate 3', 89.90, ARRAY['pc', 'ps'], 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg', 680000),
  
  ('Cyberpunk 2077', 99.90, ARRAY['pc', 'ps', 'xbox'], 'https://upload.wikimedia.org/wikipedia/pt/f/f7/Cyberpunk_2077_capa.png', 1200000),
  
  ('Hollow Knight: Silksong', 99.90, ARRAY['pc', 'ps', 'xbox'], 'https://d1q3zw97enxzq2.cloudfront.net/images/hollow-knight-silksong-title.width-1500.format-webp.webp', 890000),
  
  ('Dark Souls 3', 99.90, ARRAY['pc', 'ps', 'xbox'], 'https://cdn.dlcompare.com/game_tetiere/upload/gameimage/file/7437.jpeg.webp', 760000),
  
  ('Call of Duty: Modern Warfare', 99.90, ARRAY['pc', 'ps', 'xbox'], 'https://s2.glbimg.com/kyu390xzu8z8_XbM1vSu27JdIjg=/0x0:1000x563/984x0/smart/filters:strip_icc()/i.s3.glbimg.com/v1/AUTH_bc8228b6673f488aa253bbcb03c80ec5/internal_photos/bs/2019/h/L/9O2uOKROWYxLvkOJPRew/call-of-duty-modern-warfare.jpg', 430000),
  
  ('PEAK', 99.90, ARRAY['pc', 'ps', 'xbox'], 'https://i.ytimg.com/vi/_ce92i38ISY/maxresdefault.jpg', 680000);

-- Verifica os dados inseridos
SELECT * FROM jogos ORDER BY id;
