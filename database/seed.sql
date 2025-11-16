-- Seed data for ProjetoGameStore
-- Minimal seed: ensure some popular games exist.

INSERT INTO jogos (title, price, platforms, image, plays)
SELECT 'The Witcher 3', 59.90, ARRAY['pc','ps','xbox'], 'https://i.imgur.com/witcher3.jpg', 50000
WHERE NOT EXISTS (SELECT 1 FROM jogos WHERE title='The Witcher 3');

INSERT INTO jogos (title, price, platforms, image, plays)
SELECT 'Elden Ring', 89.90, ARRAY['pc','ps','xbox'], 'https://i.imgur.com/eldenring.jpg', 75000
WHERE NOT EXISTS (SELECT 1 FROM jogos WHERE title='Elden Ring');

-- Game Pass items are inserted by backend seed script: Backend/scripts/seed-gamepass.js
