/**
 * GameStore Backend API
 * 
 * API REST para e-commerce de jogos digitais
 * Conecta ao PostgreSQL para gerenciar catálogo de jogos
 * 
 * Principais rotas:
 * - GET  /api/jogos         - Lista todos os jogos do banco
 * - GET  /api/games         - Alias para /api/jogos (compatibilidade)
 * - GET  /api/top-played    - Jogos mais jogados
 * - POST /api/checkout      - Processa compra de jogo
 * - GET  /api/rawg-games    - Proxy para API RAWG
 * - POST /api/support/ticket - Cria ticket de suporte
 */

require('dotenv').config(); // load .env into process.env
const express = require("express");
const cors = require("cors");
const fetch = require('node-fetch');
const { pool } = require('./db'); // Importa a conexão com PostgreSQL
const { authMiddleware, optionalAuth } = require('./middlewares/authMiddleware');
const authController = require('./controllers/authController');
const comprasRoutes = require('./routes/compras');
const app = express();
const PORT = process.env.PORT || 3000;

// Validar JWT_SECRET ao iniciar o servidor
if (!process.env.JWT_SECRET) {
  console.error('❌ ERRO CRÍTICO: JWT_SECRET não configurado no arquivo .env');
  console.error('   Adicione uma linha com: JWT_SECRET=sua_chave_secreta_aqui');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Simple request logger to help debugging (prints every incoming request)
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Seed mínimo para produtos Game Pass (garante presença no banco)
async function ensureGamePassProducts(){
  const items = [
    { title: 'XBOX Gamepass 3 meses', price: 89.90 },
    { title: 'XBOX Gamepass 6 meses', price: 159.90 },
    { title: 'XBOX Gamepass 12 meses', price: 299.90 },
    { title: 'XBOX Gamepass Ultimate 12 meses', price: 399.90 },
  ];
  const img = 'https://images.kabum.com.br/produtos/fotos/267029/gift-card-xbox-game-pass-ultimate-3-mes-codigo-digital_1738875974_gg.jpg';
  try{
    for(const it of items){
      const r = await pool.query('SELECT id FROM jogos WHERE title = $1', [it.title]);
      if(r.rows.length === 0){
        await pool.query(
          'INSERT INTO jogos (title, price, platforms, image, plays) VALUES ($1, $2, $3, $4, $5)',
          [it.title, it.price, ['xbox'], img, 0]
        );
        console.log('✅ Seed GamePass inserido:', it.title);
      }
    }
  }catch(err){
    console.warn('Seed GamePass falhou (seguindo sem interromper):', err.message || err);
  }
}

// dispara seed em background (não bloqueia start)
ensureGamePassProducts();

// Endpoint para listar jogos (conectado ao PostgreSQL)
// GET /api/jogos - Retorna todos os jogos do banco de dados
app.get("/api/jogos", async (req, res) => {
  try {
    // Executa query SELECT para buscar todos os jogos
    const result = await pool.query('SELECT * FROM jogos ORDER BY id');
    
    // Retorna os jogos em formato JSON
    res.json(result.rows);
  } catch (error) {
    // Log do erro no console para debug
    console.error('Erro ao buscar jogos:', error);
    
    // Retorna erro 500 com mensagem
    res.status(500).json({ 
      error: 'Erro ao buscar jogos do banco de dados',
      details: error.message 
    });
  }
});

// Mantém rota /api/games para compatibilidade (redireciona para /api/jogos)
app.get("/api/games", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jogos ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar jogos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jogos do banco de dados',
      details: error.message 
    });
  }
});

// GET /api/jogos/recomendado - Retorna 1 jogo aleatório do banco
app.get('/api/jogos/recomendado', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, price, image
       FROM jogos
       WHERE title IS NOT NULL
       ORDER BY RANDOM()
       LIMIT 1`
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Nenhum jogo encontrado' });
    }
    const row = result.rows[0];
    return res.json({ id: row.id, title: row.title, price: Number(row.price || 0), image: row.image || '' });
  } catch (error) {
    console.error('Erro em /api/jogos/recomendado:', error);
    return res.status(500).json({ error: 'Erro ao obter recomendação', details: error.message });
  }
});

// GET /api/games/count - Retorna o total de jogos no catálogo (incluindo Game Pass)
app.get("/api/games/count", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total FROM jogos`
    );
    const total = parseInt(result.rows[0]?.total || 0);
    res.json({ total });
  } catch (error) {
    console.error('Erro ao contar jogos:', error);
    res.status(500).json({ 
      error: 'Erro ao contar jogos',
      details: error.message 
    });
  }
});

// Lista produtos do Game Pass a partir da tabela jogos
app.get('/api/gamepass', async (req, res) => {
  try{
    const result = await pool.query(
      `SELECT id, title, price, image, platforms, plays
       FROM jogos
       WHERE title ILIKE '%gamepass%'
       ORDER BY id`
    );
    return res.json(result.rows);
  }catch(err){
    console.error('Erro em /api/gamepass', err);
    return res.status(500).json({ error: 'Erro ao buscar Game Pass', details: err.message });
  }
});

// Search games by title (typeahead)
// GET /api/games/search?q=witcher&limit=8
app.get('/api/games/search', async (req, res) => {
  try{
    const q = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit) || 8, 30);
    if(q.length < 1){ return res.json([]); }
    const like = `%${q}%`;
    const sql = `
      SELECT id, title, price, image
      FROM jogos
      WHERE title ILIKE $1
      ORDER BY plays DESC NULLS LAST, id ASC
      LIMIT $2
    `;
    const r = await pool.query(sql, [like, limit]);
    return res.json(r.rows);
  }catch(err){
    console.error('Erro em /api/games/search', err);
    return res.status(500).json({ error: 'Erro ao buscar jogos', details: err.message });
  }
});

// Endpoint: top played games of the year
// GET /api/top-played - Retorna os jogos mais jogados (com mais plays)
app.get('/api/top-played', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    // Busca jogos ordenados por plays (descendente) e limita o resultado
    const result = await pool.query(
      'SELECT * FROM jogos ORDER BY plays DESC LIMIT $1',
      [limit]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar top jogos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jogos mais jogados',
      details: error.message 
    });
  }
});

// Proxy endpoint to RAWG Video Games Database API
// Usage: /api/rawg-games?search=witcher&page_size=10&page=1
// If you set RAWG_API_KEY in env, it will be sent as `key` param. Otherwise it will try without key (may be rate-limited).
app.get('/api/rawg-games', async (req, res) => {
  try{
    const q = req.query.search || '';
    const page_size = parseInt(req.query.page_size) || 10;
    const page = parseInt(req.query.page) || 1;
    const key = process.env.RAWG_API_KEY; // optional

    const url = new URL('https://api.rawg.io/api/games');
    if(key) url.searchParams.set('key', key);
    if(q) url.searchParams.set('search', q);
    url.searchParams.set('page_size', String(page_size));
    url.searchParams.set('page', String(page));

    const r = await fetch(url.href);
    if(!r.ok){
      const text = await r.text().catch(()=> 'no body');
      return res.status(r.status).send(text);
    }
    const data = await r.json();

    // Map RAWG results to a simplified game shape the frontend can use
    const results = (data.results || []).map(g => ({
      id: g.id,
      title: g.name,
      // RAWG doesn't provide price; we synthesize a placeholder price using rating to vary numbers
      price: Number((10 + (g.rating || 0) * 7).toFixed(2)),
      platforms: (g.platforms || []).map(p => p.platform && p.platform.name).filter(Boolean),
      image: g.background_image || '',
      rawg_slug: g.slug,
    }));

    res.json({ count: data.count, results });
  }catch(err){
    console.error('Error fetching RAWG', err);
    res.status(500).json({ error: 'Erro ao consultar RAWG', details: err.message });
  }
});

// GET /api/games/popular -> fetch top 10 popular games from RAWG
app.get('/api/games/popular', async (req, res) => {
  try{
    const key = process.env.RAWG_API_KEY;
    const url = new URL('https://api.rawg.io/api/games');
    if(key) url.searchParams.set('key', key);
    url.searchParams.set('page_size', '10');
    // ordering by -added approximates popularity (most added to user lists)
    url.searchParams.set('ordering', '-added');

    const r = await fetch(url.href);
    if(!r.ok){
      const text = await r.text().catch(()=> 'no body');
      console.error('RAWG /games/popular fetch failed', r.status, text);
      return res.status(502).json({ error: 'Falha ao consultar API RAWG.', details: text });
    }
    const data = await r.json();
    const results = (data.results || []).map(g => ({
      id: g.id,
      name: g.name,
      background_image: g.background_image || '',
      rating: g.rating || 0,
      released: g.released || null
    }));

    return res.json(results.slice(0,10));
  }catch(err){
    console.error('Error in /api/games/popular', err);
    return res.status(500).json({ error: 'Erro ao obter jogos populares.', details: err.message });
  }
});

// Endpoint: aggregate news / articles for games via RAWG
// Usage: /api/rawg-news?search=elden&page_size=5
app.get('/api/rawg-news', async (req, res) => {
  try{
    const q = req.query.search || '';
    const page_size = parseInt(req.query.page_size) || 5;
    const page = parseInt(req.query.page) || 1;
    const key = process.env.RAWG_API_KEY;

    // First, search for games matching query so we can look for related content
    const gamesUrl = new URL('https://api.rawg.io/api/games');
    if(key) gamesUrl.searchParams.set('key', key);
    if(q) gamesUrl.searchParams.set('search', q);
    gamesUrl.searchParams.set('page_size', String(page_size));
    gamesUrl.searchParams.set('page', String(page));

    const gamesResp = await fetch(gamesUrl.href);
    if(!gamesResp.ok){
      const text = await gamesResp.text().catch(()=> 'no body');
      return res.status(gamesResp.status).send(text);
    }
    const gamesData = await gamesResp.json();

    const aggregated = [];

    // For each game try to fetch a dedicated "news" endpoint (if RAWG provides it)
    // If not available, create a lightweight article-like item using the game's metadata
    for(const g of (gamesData.results || [])){
      try{
        // try /games/{slug}/news (RAWG may or may not support it) -- best-effort
        const newsUrl = new URL(`https://api.rawg.io/api/games/${g.slug}/news`);
        if(key) newsUrl.searchParams.set('key', key);
        const nresp = await fetch(newsUrl.href);
        if(nresp.ok){
          const nd = await nresp.json();
          // If the response contains articles array, map them
          if(Array.isArray(nd.results) && nd.results.length){
            for(const art of nd.results){
              aggregated.push({
                title: art.title || (`${g.name} — notícia`),
                excerpt: art.excerpt || art.description || '',
                image: art.image || g.background_image || '',
                url: art.url || (`https://rawg.io/games/${g.slug}`),
                published_at: art.published_at || art.date || null,
                source: art.source || 'rawg_news'
              });
            }
            // continue to next game
            continue;
          }
        }
      }catch(err){
        // ignore per-game news fetch errors and fallback
        console.debug('no per-game news for', g.slug, err.message || err);
      }

      // Fallback: craft a pseudo-article from game metadata
      aggregated.push({
        title: `${g.name} está em evidência`,
        excerpt: g.released ? `Lançado em ${g.released}` : `Visite a página do jogo para mais informações.`,
        image: g.background_image || '',
        url: `https://rawg.io/games/${g.slug}`,
        published_at: g.updated || g.released || null,
        source: 'rawg_fallback'
      });
    }

    // sort aggregated by published_at when available (newest first)
    aggregated.sort((a,b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });

    res.json({ count: aggregated.length, results: aggregated });
  }catch(err){
    console.error('Error fetching RAWG news', err);
    res.status(500).json({ error: 'Erro ao consultar notícias RAWG', details: err.message });
  }
});
// ========================================
// ENDPOINT DE COMPRA (CHECKOUT)
// ========================================
// POST /api/checkout - Processa a compra e registra no banco de dados
// Requer autenticação via JWT
app.post("/api/checkout", authMiddleware, async (req, res) => {
  const { gameId, nome, email, cep, formaPagamento, cupom, cart } = req.body;
  const userId = req.userId; // ID do usuário autenticado (do token JWT)

  // Validação: formaPagamento é obrigatório
  if(!formaPagamento){
    return res.status(400).json({ 
      error: 'Forma de pagamento é obrigatória',
      mensagem: 'Selecione uma forma de pagamento para continuar.'
    });
  }

  // Gera protocolo único para a compra
  const protocolo = '#CHK' + Math.floor(100000 + Math.random() * 900000).toString();

  console.log('\n[CHECKOUT] ' + new Date().toISOString());
  console.log(' Protocolo:', protocolo);
  console.log(' User ID:', userId);
  if(nome) console.log(' Nome:', nome);
  if(email) console.log(' Email:', email);
  if(cep) console.log(' CEP:', cep);
  console.log(' FormaPagamento:', formaPagamento);
  if(cupom) console.log(' Cupom:', cupom);

  try {
    // ========================================
    // PROCESSAMENTO DO CARRINHO
    // ========================================
    let itemsToSave = [];
    let totalPrice = 0;

    // Verifica se há carrinho com múltiplos itens
    if(Array.isArray(cart) && cart.length > 0){
      console.log(' Carrinho com', cart.length, 'item(ns)');
      
      // Processa cada item do carrinho
      for(const item of cart){
        const gameResult = await pool.query('SELECT * FROM jogos WHERE id = $1', [item.id]);
        if(gameResult.rows.length > 0){
          const game = gameResult.rows[0];
          const qty = parseInt(item.qty) || 1;
          const itemTotal = parseFloat(game.price) * qty;
          
          itemsToSave.push({
            game_id: game.id,
            quantity: qty,
            price: game.price
          });
          
          totalPrice += itemTotal;
          console.log('  -', game.title, 'x', qty, '= R$', itemTotal.toFixed(2));
        }
      }
    } 
    // Fallback: compra de um único jogo (fluxo legado)
    else if(gameId){
      console.log(' Compra de jogo único (ID:', gameId, ')');
      
      const gameResult = await pool.query('SELECT * FROM jogos WHERE id = $1', [gameId]);
      if(gameResult.rows.length === 0){
        return res.status(404).json({ error: 'Jogo não encontrado' });
      }
      
      const game = gameResult.rows[0];
      itemsToSave.push({
        game_id: game.id,
        quantity: 1,
        price: game.price
      });
      
      totalPrice = parseFloat(game.price);
      console.log('  -', game.title, '= R$', totalPrice.toFixed(2));
    } 
    else {
      return res.status(400).json({ 
        error: 'Nenhum item para comprar',
        mensagem: 'Adicione itens ao carrinho antes de finalizar a compra.'
      });
    }

    // Validação: carrinho não pode estar vazio
    if(itemsToSave.length === 0){
      return res.status(400).json({ 
        error: 'Carrinho vazio',
        mensagem: 'Adicione itens ao carrinho antes de finalizar a compra.'
      });
    }

    console.log(' Total da compra: R$', totalPrice.toFixed(2));

    // ========================================
    // SALVAR NO BANCO DE DADOS
    // ========================================
    // Inicia transação para garantir consistência dos dados
    await pool.query('BEGIN');

    try {
      // 1. Insere o pedido na tabela orders
      const orderResult = await pool.query(
        'INSERT INTO orders (user_id, total_price, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [userId, totalPrice]
      );
      
      const orderId = orderResult.rows[0].id;
      console.log(' Order ID criado:', orderId);

      // 2. Insere todos os itens do pedido na tabela order_items
      for(const item of itemsToSave){
        await pool.query(
          'INSERT INTO order_items (order_id, game_id, quantity) VALUES ($1, $2, $3)',
          [orderId, item.game_id, item.quantity]
        );
      }

      // Confirma a transação
      await pool.query('COMMIT');
      console.log(' ✅ Compra salva com sucesso no banco de dados!\n');

      // Retorna sucesso para o frontend
      return res.json({ 
        sucesso: true, 
        mensagem: 'Compra realizada com sucesso!', 
        protocolo,
        orderId // Retorna o ID do pedido criado
      });

    } catch (dbError) {
      // Em caso de erro, desfaz todas as operações
      await pool.query('ROLLBACK');
      console.error(' ❌ Erro ao salvar compra no banco:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('❌ ERRO NO CHECKOUT:', error);
    console.error('Stack trace:', error.stack);
    
    // Mensagem específica se a tabela não existir
    if(error.message && error.message.includes('does not exist')){
      return res.status(500).json({ 
        error: 'Tabelas não criadas',
        mensagem: 'As tabelas de pedidos não foram criadas no banco de dados. Execute o script setup-orders.sql',
        details: 'Tabelas orders/order_items não existem' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao processar compra',
      mensagem: 'Ocorreu um erro ao processar sua compra. Tente novamente.',
      details: error.message 
    });
  }
});

// ========================================
// ROTAS DE AUTENTICAÇÃO (JWT)
// ========================================

// POST /api/auth/register - Cadastro de novo usuário (retorna token)
app.post('/api/auth/register', authController.register);

// POST /api/auth/login - Login de usuário (retorna token JWT)
app.post('/api/auth/login', authController.login);

// GET /api/auth/verify - Verifica se o token é válido (requer autenticação)
app.get('/api/auth/verify', authMiddleware, authController.verifyToken);

// POST /api/auth/refresh - Renova o token JWT (requer autenticação)
app.post('/api/auth/refresh', authMiddleware, authController.refreshToken);

// GET /api/account/:id - Dados da conta + compras (PROTEGIDA)
// Retorna dados do usuário e uma lista de compras (se a tabela existir)
// Agora protegida por JWT - usuário só pode ver sua própria conta
app.get('/api/account/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId; // Do token JWT
  
  // Validação: usuário só pode acessar sua própria conta
  if (parseInt(id) !== userId) {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Você só pode acessar sua própria conta' 
    });
  }
  
  if(!id) return res.status(400).json({ error: 'missing id' });

  try {
    // Busca dados básicos do usuário
    const u = await pool.query(
      'SELECT id, username, email, nome_completo, created_at FROM usuarios WHERE id = $1',
      [id]
    );

    if(u.rows.length === 0){
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = u.rows[0];

    // Tenta buscar compras do usuário (se tabela existir)
    let purchases = [];
    try {
      const p = await pool.query(
        `SELECT c.id,
                c.preco AS valor,
                c.data_compra AS created_at,
                j.id AS jogo_id,
                j.title,
                j.image
         FROM compras c
         JOIN jogos j ON j.id = c.jogo_id
         WHERE c.usuario_id = $1
         ORDER BY c.data_compra DESC
         LIMIT 20`,
        [id]
      );
      purchases = p.rows;
    } catch (err) {
      // Fallback silencioso se tabela não existir
      purchases = [];
    }

    return res.json({ user, purchases });
  } catch (error) {
    console.error('Erro em /api/account/:id', error);
    return res.status(500).json({ error: 'Erro ao buscar dados da conta', details: error.message });
  }
});

// ========================================
// HISTÓRICO DE COMPRAS DO USUÁRIO
// ========================================
// GET /api/orders/user/:id - Retorna todas as compras do usuário com detalhes dos jogos
// Requer autenticação via JWT
app.get('/api/orders/user/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId; // ID do usuário autenticado (do token JWT)
  
  // Validação: usuário só pode ver suas próprias compras
  if (parseInt(id) !== userId) {
    return res.status(403).json({ 
      error: 'Acesso negado',
      message: 'Você só pode acessar seu próprio histórico de compras' 
    });
  }

  try {
    // ========================================
    // BUSCA TODAS AS COMPRAS DO USUÁRIO
    // ========================================
    // Query com JOIN entre orders, order_items e jogos
    // Agrupa os jogos por pedido para facilitar renderização
    const ordersResult = await pool.query(
      `SELECT 
        o.id AS order_id,
        o.total_price,
        o.created_at,
        json_agg(
          json_build_object(
            'game_id', j.id,
            'title', j.title,
            'image', j.image,
            'price', j.price,
            'quantity', oi.quantity
          ) ORDER BY oi.id
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN jogos j ON j.id = oi.game_id
      WHERE o.user_id = $1
      GROUP BY o.id, o.total_price, o.created_at
      ORDER BY o.created_at DESC
      LIMIT 50`,
      [id]
    );

    // Formata os dados para o frontend
    const orders = ordersResult.rows.map(row => ({
      orderId: row.order_id,
      totalPrice: parseFloat(row.total_price),
      createdAt: row.created_at,
      items: row.items || []
    }));

    console.log(`[ORDERS] Usuário ${id} possui ${orders.length} compra(s)`);
    
    return res.json({ 
      success: true,
      orders: orders,
      total: orders.length
    });

  } catch (error) {
    console.error('Erro em /api/orders/user/:id', error);
    
    // Se a tabela não existe, retorna lista vazia
    if(error.message && error.message.includes('does not exist')){
      return res.json({ 
        success: true,
        orders: [],
        total: 0,
        message: 'Nenhuma compra registrada ainda'
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao buscar histórico de compras',
      details: error.message 
    });
  }
});

// GET /api/games/:id/details
// Proxies RAWG game details endpoint and returns a simplified object
app.get('/api/games/:id/details', async (req, res) => {
  const id = req.params.id;
  if(!id) return res.status(400).json({ error: 'missing id' });
  try{
    const key = process.env.RAWG_API_KEY;
    const url = new URL(`https://api.rawg.io/api/games/${id}`);
    if(key) url.searchParams.set('key', key);

    const r = await fetch(url.href);
    if(!r.ok){
      const text = await r.text().catch(()=> 'no body');
      console.error('RAWG /games/:id fetch failed', r.status, text);
      return res.status(502).json({ error: 'Falha ao consultar RAWG.', details: text });
    }

    const data = await r.json();
    // Map to required shape
    const out = {
      id: data.id,
      name: data.name || null,
      description_raw: data.description_raw || data.description || null,
      genres: Array.isArray(data.genres) ? data.genres.map(g => g.name).filter(Boolean) : [],
      platforms: Array.isArray(data.platforms) ? data.platforms.map(p => (p.platform && p.platform.name) || (p.name || null)).filter(Boolean) : [],
      rating: typeof data.rating === 'number' ? data.rating : null,
      background_image: data.background_image || null
    };

    return res.json(out);
  }catch(err){
    console.error('Error in /api/games/:id/details', err);
    return res.status(500).json({ error: 'Erro ao obter detalhes do jogo', details: err.message });
  }
});

// ========================================
// CONTA DO USUÁRIO (ME) - PROTEGIDA COM JWT
// ========================================
// GET /api/user/me - Dados básicos do usuário autenticado
// Requer token JWT no header: Authorization: Bearer <token>
app.get('/api/user/me', authMiddleware, async (req, res) => {
  const userId = req.userId; // Extraído do token JWT pelo middleware
  try{
    const r = await pool.query(
      'SELECT nome_completo, email, created_at, username FROM usuarios WHERE id = $1',
      [userId]
    );
    if(r.rows.length === 0){
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const row = r.rows[0];
    return res.json({
      nome: row.nome_completo || row.username || '',
      email: row.email || '',
      created_at: row.created_at
    });
  }catch(err){
    console.error('Erro em /api/user/me', err);
    return res.status(500).json({ error: 'Erro ao carregar dados do usuário', details: err.message });
  }
});

// POST /api/support/ticket
// Receives support ticket with name, email, subject, message
// Generates random 6-digit protocol starting with #2 (e.g., #294919)
// Logs to console and returns protocol
app.post('/api/support/ticket', (req, res) => {
  const { name, email, subject, message } = req.body;

  // Validate required fields
  if(!name || !email || !message){
    return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
  }

  // Generate random 6-digit protocol starting with #2
  const random4Digits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const protocolo = `#2${random4Digits}`;

  // Log ticket to console
  console.log(`\n[SUPPORT TICKET] ${new Date().toISOString()}`);
  console.log(`  Protocolo: ${protocolo}`);
  console.log(`  Nome: ${name}`);
  console.log(`  Email: ${email}`);
  console.log(`  Assunto: ${subject || 'não informado'}`);
  console.log(`  Mensagem: ${message}`);
  console.log('');

  // Return success response with protocol
  res.json({
    status: 'ok',
    protocolo: protocolo,
    mensagem: 'Seu ticket foi aberto com sucesso.'
  });
});

// GET /api/games/:id/trailer
// Proxies RAWG movies endpoint and returns the first trailer + full list
// trailer functionality removed

// GET /api/games/:id/streams
// Proxies RAWG twitch endpoint and returns simplified streamer objects
// streams functionality removed

// Debug route: list registered routes (useful to confirm routes are loaded)
app.get('/__routes', (req, res) => {
  try{
    const routes = [];
    if(app._router && app._router.stack){
      app._router.stack.forEach(m => {
        if(m.route && m.route.path){
          const methods = Object.keys(m.route.methods).join(',');
          routes.push({ path: m.route.path, methods });
        }
      });
    }
    res.json({ routes });
  }catch(err){
    res.status(500).json({ error: 'failed to list routes', details: err.message });
  }
});

// ================================
// ROTAS: COMPRAS (HISTÓRICO)
// ================================
app.use('/api/compras', comprasRoutes);

// API not-found handler — return JSON instead of Express HTML 404 for /api/* requests
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.path });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));