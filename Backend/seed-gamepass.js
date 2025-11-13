require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const items = [
    { title: 'XBOX Gamepass 3 meses', price: 89.90 },
    { title: 'XBOX Gamepass 6 meses', price: 159.90 },
    { title: 'XBOX Gamepass 12 meses', price: 299.90 },
    { title: 'XBOX Gamepass Ultimate 12 meses', price: 399.90 },
  ];
  const image = 'https://images.kabum.com.br/produtos/fotos/267029/gift-card-xbox-game-pass-ultimate-3-mes-codigo-digital_1738875974_gg.jpg';

  const client = await pool.connect();
  try {
    console.log('Seeding Game Pass items into jogos...');
    for (const it of items) {
      // Upsert by title (case-sensitive match)
      await client.query(
        `INSERT INTO jogos (title, price, platforms, image, plays)
         SELECT $1, $2, $3, $4, 0
         WHERE NOT EXISTS (SELECT 1 FROM jogos WHERE title = $1)`,
        [it.title, it.price, ['xbox'], image]
      );
      console.log('Ensured:', it.title);
    }
    console.log('Done.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
