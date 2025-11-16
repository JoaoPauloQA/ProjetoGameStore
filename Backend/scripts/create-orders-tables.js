/**
 * Script para Criar Tabelas de Pedidos Automaticamente
 * 
 * Este script cria as tabelas orders e order_items
 * diretamente no banco de dados PostgreSQL
 * 
 * Execute: node scripts/create-orders-tables.js
 */

require('dotenv').config();
const { pool } = require('..\/db');

async function createTables() {
  console.log('\n🔧 Criando tabelas de pedidos no banco de dados...\n');
  
  try {
    // Inicia transação
    await pool.query('BEGIN');
    
    console.log('📝 Criando tabela orders...');
    
    // Cria tabela orders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        total_price  DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ Tabela orders criada com sucesso!');
    
    // Cria índices da tabela orders
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    `);
    
    console.log('✅ Índices da tabela orders criados!');
    
    console.log('\n📝 Criando tabela order_items...');
    
    // Cria tabela order_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id        SERIAL PRIMARY KEY,
        order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        game_id   INTEGER NOT NULL REFERENCES jogos(id) ON DELETE RESTRICT,
        quantity  INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
      );
    `);
    
    console.log('✅ Tabela order_items criada com sucesso!');
    
    // Cria índices da tabela order_items
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_game_id ON order_items(game_id);
    `);
    
    console.log('✅ Índices da tabela order_items criados!');
    
    // Confirma transação
    await pool.query('COMMIT');
    
    console.log('\n✅ SUCESSO! Todas as tabelas foram criadas com sucesso!\n');
    console.log('📋 Estrutura criada:');
    console.log('   - Tabela: orders (id, user_id, total_price, created_at)');
    console.log('   - Tabela: order_items (id, order_id, game_id, quantity)');
    console.log('   - Índices: otimizados para consultas rápidas\n');
    console.log('🚀 Agora você pode reiniciar o servidor e testar o checkout!\n');
    
  } catch (error) {
    // Desfaz em caso de erro
    await pool.query('ROLLBACK');
    
    console.error('\n❌ Erro ao criar tabelas:', error.message);
    console.error('\nDetalhes do erro:');
    console.error(error);
    console.error('\n💡 Verifique se:');
    console.error('   1. O banco de dados está rodando');
    console.error('   2. As credenciais no arquivo .env estão corretas');
    console.error('   3. A tabela usuarios existe (necessária para foreign key)\n');
    
  } finally {
    await pool.end();
  }
}

createTables();
