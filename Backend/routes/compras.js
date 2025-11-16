const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authMiddleware } = require('../middlewares/authMiddleware');

// GET /api/compras/historico
// Retorna compras do usuário autenticado a partir da tabela 'compras'
router.get('/historico', authMiddleware, async (req, res) => {
  const userId = req.userId;
  try{
    let purchases = [];

    // Verifica se a tabela 'compras' existe; se existir, tenta carregar
    const exists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'compras'
      ) AS ok;
    `);

    if(exists.rows[0].ok){
      try{
        const sql = `
          SELECT c.id,
                 c.usuario_id,
                 c.data_compra,
                 COALESCE(c.preco, 0) AS valor,
                 j.title AS produto,
                 j.image AS image
          FROM compras c
          LEFT JOIN jogos j ON j.id = c.jogo_id
          WHERE c.usuario_id = $1
          ORDER BY c.data_compra DESC, c.id DESC
          LIMIT 50`;
        const r = await pool.query(sql, [userId]);
        purchases = r.rows.map(row => ({
          id: row.id,
          produto: row.produto || 'Produto',
          valor: Number(row.valor || 0),
          data_compra: row.data_compra,
          image: row.image || ''
        }));
      }catch(_e){ /* segue para fallback */ }
    }

    // Fallback: se não houver registros em 'compras' (ou tabela não existir), tenta 'orders' + 'order_items'
    if(purchases.length === 0){
      try{
        const ordExists = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='orders'
          ) AS ok;
        `);
        const itExists = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name='order_items'
          ) AS ok;
        `);
        if(ordExists.rows[0].ok && itExists.rows[0].ok){
          const q = `
            SELECT o.id AS order_id,
                   o.created_at,
                   j.title AS produto,
                   j.image,
                   COALESCE(j.price,0) * COALESCE(oi.quantity,1) AS valor
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN jogos j ON j.id = oi.game_id
            WHERE o.user_id = $1
            ORDER BY o.created_at DESC, o.id DESC
            LIMIT 200`;
          const rr = await pool.query(q, [userId]);
          purchases = rr.rows.map(x => ({
            id: x.order_id,
            produto: x.produto || 'Produto',
            valor: Number(x.valor||0),
            data_compra: x.created_at,
            image: x.image || ''
          }));
        }
      }catch(_e){ /* ignore fallback errors */ }
    }

    return res.json({ success: true, purchases, total: purchases.length });
  }catch(err){
    console.error('Erro em GET /api/compras/historico', err);
    return res.status(500).json({ error: 'Erro ao carregar histórico', details: err.message });
  }
});

module.exports = router;
