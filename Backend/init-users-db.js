/**
 * Script para inicializar a tabela de usuários no PostgreSQL
 * Execute com: node init-users-db.js
 */

require('dotenv').config();
const { pool } = require('./db');
const fs = require('fs');
const path = require('path');

async function initUsersTable() {
  let client;
  
  try {
    console.log('🔌 Conectando ao PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Conexão estabelecida!\n');

    // Lê o arquivo SQL
    const sqlPath = path.join(__dirname, 'setup-users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Criando tabela de usuários...');
    
    // Executa o script SQL
    await client.query(sql);
    
    console.log('✅ Tabela "usuarios" criada com sucesso!\n');

    // Busca e exibe os usuários
    const result = await client.query('SELECT id, username, email, nome_completo, created_at FROM usuarios ORDER BY id');
    
    console.log('📊 Usuários cadastrados:');
    console.log('═'.repeat(80));
    result.rows.forEach(user => {
      console.log(`ID: ${user.id} | User: ${user.username.padEnd(15)} | Email: ${user.email.padEnd(30)} | Nome: ${user.nome_completo || 'N/A'}`);
    });
    console.log('═'.repeat(80));
    console.log(`\n✨ Total: ${result.rows.length} usuário(s) cadastrado(s)\n`);
    
  } catch (error) {
    console.error('❌ Erro ao inicializar tabela de usuários:', error.message);
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
initUsersTable();
