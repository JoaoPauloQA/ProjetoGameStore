/**
 * Script de Verificação das Tabelas de Pedidos
 * 
 * Este script verifica se as tabelas orders e order_items
 * foram criadas corretamente no banco de dados PostgreSQL
 * 
 * Execute: node scripts/verify-orders-tables.js
 */

require('dotenv').config();
const { pool } = require('..\/db');

async function verifyTables() {
  console.log('\n🔍 Verificando tabelas de pedidos...\n');
  
  try {
    // Verifica se a tabela orders existe
    const ordersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);
    
    const ordersExists = ordersCheck.rows[0].exists;
    console.log(ordersExists ? '✅ Tabela orders existe' : '❌ Tabela orders NÃO existe');
    
    // Verifica se a tabela order_items existe
    const itemsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'order_items'
      );
    `);
    
    const itemsExists = itemsCheck.rows[0].exists;
    console.log(itemsExists ? '✅ Tabela order_items existe' : '❌ Tabela order_items NÃO existe');
    
    if(ordersExists && itemsExists){
      console.log('\n✅ SUCESSO: Todas as tabelas necessárias existem!\n');
      
      // Mostra estrutura das tabelas
      console.log('📋 Estrutura da tabela orders:');
      const ordersColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'orders'
        ORDER BY ordinal_position;
      `);
      console.table(ordersColumns.rows);
      
      console.log('\n📋 Estrutura da tabela order_items:');
      const itemsColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_items'
        ORDER BY ordinal_position;
      `);
      console.table(itemsColumns.rows);
      
      // Conta registros existentes
      const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
      const itemsCount = await pool.query('SELECT COUNT(*) FROM order_items');
      
      console.log(`\n📊 Total de pedidos: ${ordersCount.rows[0].count}`);
      console.log(`📊 Total de itens: ${itemsCount.rows[0].count}\n`);
      
    } else {
      console.log('\n❌ ERRO: Tabelas não encontradas!');
      console.log('\n📝 Para criar as tabelas, execute:');
      console.log('   psql -U seu_usuario -d seu_banco -f setup-orders.sql\n');
      console.log('   Ou execute manualmente o conteúdo do arquivo setup-orders.sql\n');
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao verificar tabelas:', error.message);
    console.error('   Verifique sua conexão com o banco de dados.\n');
  } finally {
    await pool.end();
  }
}

verifyTables();
