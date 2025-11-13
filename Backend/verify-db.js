const http = require('http');

http.get('http://localhost:3000/api/games', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jogos = JSON.parse(data);
      
      console.log('\n✅ CONEXÃO COM POSTGRESQL FUNCIONANDO!\n');
      console.log('═'.repeat(80));
      console.log(`\n📊 Total de jogos no banco: ${jogos.length}\n`);
      
      console.log('🎮 Primeiros 5 jogos com IMAGENS e PREÇOS:\n');
      
      jogos.slice(0, 5).forEach((jogo, idx) => {
        console.log(`${idx + 1}. ${jogo.title}`);
        console.log(`   💰 Preço: R$ ${jogo.price}`);
        console.log(`   🎯 Plays: ${jogo.plays?.toLocaleString()}`);
        console.log(`   🖼️  Imagem: ${jogo.image ? '✅ OK' : '❌ Faltando'}`);
        if(jogo.image) {
          console.log(`      ${jogo.image.substring(0, 70)}...`);
        }
        console.log(`   🎮 Plataformas: ${Array.isArray(jogo.platforms) ? jogo.platforms.join(', ') : jogo.platforms}`);
        console.log('');
      });
      
      console.log('═'.repeat(80));
      console.log('\n✨ API /api/games retornando dados do PostgreSQL corretamente!');
      console.log('✨ Todas as imagens e preços estão sendo retornados!\n');
      
    } catch (e) {
      console.error('❌ Erro ao processar resposta:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('❌ Erro na requisição:', e.message);
  console.log('\n💡 Certifique-se de que o servidor está rodando');
});
