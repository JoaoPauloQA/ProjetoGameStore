/**
 * Script para inicializar o banco de dados PostgreSQL
 * Cria a tabela jogos e insere dados de exemplo
 * 
 * Execute com: node scripts/init-db.js
 */

require('dotenv').config();
const { pool } = require('..\/db');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  let client;
  
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Conexão estabelecida!\n');

    // Lê o arquivo SQL a partir da raiz de Backend
    const sqlPath = path.join(__dirname, '..', 'setup-database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executando script SQL...');
    
    // Executa o script SQL
    await client.query(sql);
    
    console.log('✅ Tabela "jogos" criada com sucesso!');
    console.log('✅ Dados de exemplo inseridos!\n');

    // Busca e exibe os jogos inseridos
    const result = await client.query('SELECT id, title, price, plays FROM jogos ORDER BY id');
    
    console.log('📊 Jogos cadastrados no banco:');
    console.log('═'.repeat(70));
    result.rows.forEach(game => {
      console.log(`ID: ${game.id.toString().padEnd(3)} | ${game.title.padEnd(35)} | R$ ${game.price.toString().padEnd(6)} | ${game.plays.toLocaleString()} plays`);
    });
    console.log('═'.repeat(70));
    console.log(`\n✨ Total: ${result.rows.length} jogos cadastrados\n`);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('🔌 Conexão fechada.');
  }
}

// Executa a inicialização
initDatabase();
