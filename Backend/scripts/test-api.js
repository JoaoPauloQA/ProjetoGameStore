/**
 * Script de teste para verificar a API
 */

const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando API do GameStore\n');
  console.log('═'.repeat(80));

  try {
    // Teste 1: GET /api/jogos
    console.log('\n📝 Teste 1: GET /api/jogos');
    const jogosResult = await testEndpoint('/api/jogos');
    console.log(`   Status: ${jogosResult.status}`);
    
    if (jogosResult.status === 200 && Array.isArray(jogosResult.data)) {
      console.log(`   ✅ Sucesso! ${jogosResult.data.length} jogos retornados`);
      console.log('\n   Primeiros 3 jogos:');
      jogosResult.data.slice(0, 3).forEach((jogo, idx) => {
        console.log(`   ${idx + 1}. ${jogo.title} - R$ ${jogo.price}`);
        console.log(`      Imagem: ${jogo.image ? '✅ OK' : '❌ Faltando'}`);
        console.log(`      Plataformas: ${jogo.platforms?.join(', ') || 'N/A'}`);
      });
    } else {
      console.log(`   ❌ Erro: ${JSON.stringify(jogosResult.data)}`);
    }

    // Teste 2: GET /api/games (compatibilidade)
    console.log('\n\n📝 Teste 2: GET /api/games (compatibilidade)');
    const gamesResult = await testEndpoint('/api/games');
    console.log(`   Status: ${gamesResult.status}`);
    console.log(`   ${gamesResult.status === 200 ? '✅' : '❌'} ${gamesResult.status === 200 ? 'Funcionando' : 'Erro'}`);

    // Teste 3: GET /api/top-played
    console.log('\n📝 Teste 3: GET /api/top-played');
    const topResult = await testEndpoint('/api/top-played?limit=3');
    console.log(`   Status: ${topResult.status}`);
    
    if (topResult.status === 200 && Array.isArray(topResult.data)) {
      console.log(`   ✅ Top ${topResult.data.length} jogos mais jogados:`);
      topResult.data.forEach((jogo, idx) => {
        console.log(`   ${idx + 1}. ${jogo.title} - ${jogo.plays?.toLocaleString()} plays`);
      });
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n✨ Todos os testes concluídos!\n');

  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.message);
    console.error('\n💡 Certifique-se de que o servidor está rodando em http://localhost:3000\n');
    process.exit(1);
  }
}

// Aguarda 1 segundo e executa os testes
setTimeout(() => {
  runTests().catch(console.error);
}, 1000);
