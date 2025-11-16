/**
 * Script de teste para as rotas de autenticação
 */

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runAuthTests() {
  console.log('\n🔐 Testando Sistema de Autenticação\n');
  console.log('═'.repeat(80));

  try {
    // Teste 1: Login com usuário existente (admin / 123456)
    console.log('\n📝 Teste 1: Login com usuário admin');
    const loginResult = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: '123456'
    });
    console.log(`   Status: ${loginResult.status}`);
    if(loginResult.status === 200 && loginResult.data.success){
      console.log(`   ✅ Login bem-sucedido!`);
      console.log(`   👤 Usuário: ${loginResult.data.user.username}`);
      console.log(`   📧 Email: ${loginResult.data.user.email}`);
      console.log(`   👥 Nome: ${loginResult.data.user.nome_completo || 'N/A'}`);
    } else {
      console.log(`   ❌ Falha no login: ${JSON.stringify(loginResult.data)}`);
    }

    // Teste 2: Cadastro de novo usuário
    console.log('\n📝 Teste 2: Cadastrar novo usuário');
    const randomNum = Math.floor(Math.random() * 10000);
    const newUser = {
      username: `teste${randomNum}`,
      email: `teste${randomNum}@gamestore.com`,
      password: '123456',
      nome_completo: 'Usuário de Teste'
    };
    
    const registerResult = await makeRequest('POST', '/api/auth/register', newUser);
    console.log(`   Status: ${registerResult.status}`);
    if(registerResult.status === 201 && registerResult.data.success){
      console.log(`   ✅ Cadastro bem-sucedido!`);
      console.log(`   👤 Usuário: ${registerResult.data.user.username}`);
      console.log(`   📧 Email: ${registerResult.data.user.email}`);
    } else {
      console.log(`   ❌ Falha no cadastro: ${JSON.stringify(registerResult.data)}`);
    }

    // Teste 3: Login com o novo usuário
    if(registerResult.status === 201){
      console.log('\n📝 Teste 3: Login com novo usuário cadastrado');
      const newLoginResult = await makeRequest('POST', '/api/auth/login', {
        username: newUser.username,
        password: newUser.password
      });
      console.log(`   Status: ${newLoginResult.status}`);
      if(newLoginResult.status === 200 && newLoginResult.data.success){
        console.log(`   ✅ Login com novo usuário bem-sucedido!`);
      } else {
        console.log(`   ❌ Falha no login`);
      }
    }

    // Teste 4: Tentativa de login com senha errada
    console.log('\n📝 Teste 4: Login com senha incorreta');
    const wrongPassResult = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'senhaerrada'
    });
    console.log(`   Status: ${wrongPassResult.status}`);
    if(wrongPassResult.status === 401){
      console.log(`   ✅ Erro esperado retornado corretamente`);
    } else {
      console.log(`   ❌ Comportamento inesperado`);
    }

    // Teste 5: Verificar usuário existente
    console.log('\n📝 Teste 5: Verificar usuário existente');
    const verifyResult = await makeRequest('GET', '/api/auth/verify/admin');
    console.log(`   Status: ${verifyResult.status}`);
    if(verifyResult.status === 200 && verifyResult.data.success){
      console.log(`   ✅ Usuário encontrado!`);
      console.log(`   👤 ${verifyResult.data.user.username} - ${verifyResult.data.user.email}`);
    } else {
      console.log(`   ❌ Usuário não encontrado`);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n✨ Testes de autenticação concluídos!\n');

  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.message);
    console.error('\n💡 Certifique-se de que o servidor está rodando em http://localhost:3000\n');
    process.exit(1);
  }
}

// Aguarda 1 segundo e executa os testes
setTimeout(() => {
  runAuthTests().catch(console.error);
}, 1000);
