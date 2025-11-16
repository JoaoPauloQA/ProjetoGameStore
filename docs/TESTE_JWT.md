# 🔐 Guia de Testes - Autenticação JWT

## ✅ Implementação Completa

A autenticação JWT foi implementada com sucesso em todo o projeto. Todos os endpoints protegidos agora requerem um token JWT válido.

---

## 📋 Checklist de Funcionalidades Implementadas

### Backend
- ✅ `authMiddleware.js` - Middleware JWT para proteção de rotas
- ✅ `authController.js` - Controlador centralizado de autenticação
- ✅ JWT_SECRET configurado no `.env` (128 caracteres)
- ✅ Tokens JWT com expiração de 24 horas
- ✅ Bcrypt para hash de senhas (10 salt rounds)
- ✅ Rotas de autenticação refatoradas:
  - POST `/api/auth/register` - Retorna token JWT
  - POST `/api/auth/login` - Retorna token JWT
  - GET `/api/auth/verify` - Valida token (protegida)
  - POST `/api/auth/refresh` - Renova token (protegida)
- ✅ Rotas protegidas com `authMiddleware`:
  - GET `/api/user/me`
  - GET `/api/account/:id`

### Frontend
- ✅ `main.js` atualizado:
  - Login salva token no sessionStorage
  - Registro salva token e faz auto-login
  - Logout remove token
- ✅ `minha-conta.js` atualizado:
  - Envia token JWT no header Authorization
  - Trata token expirado (401) limpando sessão

### Segurança
- ✅ Tokens assinados com JWT_SECRET seguro
- ✅ Senhas NUNCA salvas em texto puro
- ✅ Formato Bearer token padrão: `Authorization: Bearer <token>`
- ✅ Validação de token expirado (TokenExpiredError)
- ✅ Validação de token inválido (JsonWebTokenError)
- ✅ Proteção contra acesso não autorizado (401)

---

## 🧪 Roteiro de Testes

### 1️⃣ Teste de Registro (POST /api/auth/register)

**Objetivo**: Criar nova conta e receber token JWT automaticamente.

#### Teste via Frontend:
1. Acesse `http://localhost:3000`
2. Clique em "Criar Conta"
3. Preencha:
   - **Username**: `teste_jwt`
   - **Email**: `teste@jwt.com`
   - **Nome Completo**: `Teste JWT`
   - **Senha**: `senha123`
4. Clique em "Cadastrar"
5. **Resultado Esperado**:
   - Mensagem de sucesso aparece
   - Modal fecha automaticamente após 2s
   - Botão de login muda para "👤 Teste JWT"
   - Menu de usuário aparece

#### Teste via cURL (PowerShell):
```powershell
$body = @{
    username = "teste_jwt2"
    email = "teste2@jwt.com"
    password = "senha123"
    nome_completo = "Teste JWT 2"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
$response | ConvertTo-Json
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Usuário cadastrado com sucesso!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "teste_jwt2",
    "email": "teste2@jwt.com",
    "nome_completo": "Teste JWT 2"
  }
}
```

---

### 2️⃣ Teste de Login (POST /api/auth/login)

**Objetivo**: Fazer login e receber token JWT.

#### Teste via Frontend:
1. Acesse `http://localhost:3000`
2. Clique em "Entrar"
3. Preencha:
   - **Usuário/Email**: `teste@jwt.com`
   - **Senha**: `senha123`
4. Clique em "Login"
5. **Resultado Esperado**:
   - Modal fecha automaticamente
   - Botão de login muda para nome do usuário
   - Token salvo no sessionStorage

#### Teste via cURL (PowerShell):
```powershell
$body = @{
    usernameOrEmail = "teste@jwt.com"
    password = "senha123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$response | ConvertTo-Json

# Salvar token para testes seguintes
$token = $response.token
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Login realizado com sucesso!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "teste_jwt",
    "email": "teste@jwt.com",
    "nome_completo": "Teste JWT"
  }
}
```

---

### 3️⃣ Teste de Rota Protegida - Minha Conta (GET /api/user/me)

**Objetivo**: Acessar dados do usuário usando token JWT.

#### Teste via Frontend:
1. Faça login no site
2. Acesse `http://localhost:3000/minha-conta.html`
3. **Resultado Esperado**:
   - Página carrega dados do usuário
   - Nome, email e data de criação aparecem
   - Avatar carrega corretamente

#### Teste via cURL (PowerShell) - **COM TOKEN**:
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/user/me" -Method GET -Headers $headers
$response | ConvertTo-Json
```

**Resposta esperada**:
```json
{
  "id": 123,
  "username": "teste_jwt",
  "email": "teste@jwt.com",
  "nome_completo": "Teste JWT",
  "created_at": "2025-01-15T10:30:00.000Z"
}
```

#### Teste via cURL (PowerShell) - **SEM TOKEN** (deve falhar):
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/user/me" -Method GET -ContentType "application/json"
```

**Resposta esperada (ERRO 401)**:
```json
{
  "error": "Token não fornecido"
}
```

---

### 4️⃣ Teste de Verificação de Token (GET /api/auth/verify)

**Objetivo**: Validar se o token JWT está válido.

#### Teste via cURL (PowerShell):
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/verify" -Method GET -Headers $headers
$response | ConvertTo-Json
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Token válido",
  "user": {
    "id": 123,
    "email": "teste@jwt.com",
    "username": "teste_jwt"
  }
}
```

---

### 5️⃣ Teste de Renovação de Token (POST /api/auth/refresh)

**Objetivo**: Renovar token JWT antes da expiração.

#### Teste via cURL (PowerShell):
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/refresh" -Method POST -Headers $headers
$response | ConvertTo-Json

# Atualizar token
$token = $response.token
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Token renovado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "teste@jwt.com",
    "username": "teste_jwt"
  }
}
```

---

### 6️⃣ Teste de Token Expirado

**Objetivo**: Validar comportamento quando token expira (24h).

Para simular, você pode:
1. Modificar temporariamente `authController.js` para gerar token com expiração de 5 segundos:
   ```javascript
   // Na função generateToken
   expiresIn: '5s' // Temporariamente para teste
   ```
2. Fazer login e pegar o token
3. Aguardar 6 segundos
4. Tentar acessar `/api/user/me`

**Resposta esperada (ERRO 401)**:
```json
{
  "error": "Token expirado"
}
```

---

### 7️⃣ Teste de Token Inválido

**Objetivo**: Validar comportamento com token manipulado.

#### Teste via cURL (PowerShell):
```powershell
$headers = @{
    "Authorization" = "Bearer token_invalido_fake_123"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/user/me" -Method GET -Headers $headers
```

**Resposta esperada (ERRO 401)**:
```json
{
  "error": "Token inválido"
}
```

---

### 8️⃣ Teste de Logout

**Objetivo**: Validar remoção de token no frontend.

#### Teste via Frontend:
1. Faça login no site
2. Verifique que o token existe no sessionStorage:
   - Abra DevTools (F12)
   - Console: `sessionStorage.getItem('token')`
   - Deve retornar o token JWT
3. Clique no ícone de usuário → "Sair"
4. Verifique novamente:
   - Console: `sessionStorage.getItem('token')`
   - Deve retornar `null`
5. Tente acessar `minha-conta.html`
6. **Resultado Esperado**:
   - Mensagem "Você precisa estar logado..."

---

### 9️⃣ Teste de Proteção de Conta (GET /api/account/:id)

**Objetivo**: Validar que usuário só pode acessar própria conta.

#### Teste 1 - Acessar própria conta (DEVE FUNCIONAR):
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

# Assumindo que o ID do usuário logado é 123
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/account/123" -Method GET -Headers $headers
$response | ConvertTo-Json
```

**Resposta esperada**:
```json
{
  "id": 123,
  "username": "teste_jwt",
  "email": "teste@jwt.com",
  "nome_completo": "Teste JWT"
}
```

#### Teste 2 - Tentar acessar conta de outro usuário (DEVE FALHAR):
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

# Tentando acessar ID diferente (ex: 999)
Invoke-RestMethod -Uri "http://localhost:3000/api/account/999" -Method GET -Headers $headers
```

**Resposta esperada (ERRO 403)**:
```json
{
  "error": "Você não tem permissão para acessar esta conta"
}
```

---

## 🔍 Verificação no Navegador (DevTools)

### Ver Token no SessionStorage:
1. Abra o site: `http://localhost:3000`
2. Faça login
3. Pressione F12 (DevTools)
4. Vá para a aba **Application** (Chrome) ou **Storage** (Firefox)
5. Clique em **Session Storage** → `http://localhost:3000`
6. Procure pela chave `token`
7. Deve ver um JWT no formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Decodificar Token JWT:
1. Copie o token do sessionStorage
2. Acesse: https://jwt.io/
3. Cole o token no campo "Encoded"
4. Verifique o payload:
   ```json
   {
     "id": 123,
     "email": "teste@jwt.com",
     "username": "teste_jwt",
     "iat": 1736937600,
     "exp": 1737024000
   }
   ```

---

## 🐛 Testes de Erro Comuns

### 1. Servidor sem JWT_SECRET:
```powershell
# Remova JWT_SECRET do .env temporariamente e reinicie o servidor
# Resultado esperado: Servidor não inicia com erro:
# "ERRO: JWT_SECRET não configurado no .env"
```

### 2. Login com senha incorreta:
```powershell
$body = @{
    usernameOrEmail = "teste@jwt.com"
    password = "senha_errada"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```
**Resposta esperada (ERRO 401)**:
```json
{
  "error": "Credenciais inválidas"
}
```

### 3. Registro com email duplicado:
```powershell
# Tente registrar o mesmo email duas vezes
$body = @{
    username = "novo_user"
    email = "teste@jwt.com"  # Email já existente
    password = "senha123"
    nome_completo = "Novo User"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```
**Resposta esperada (ERRO 400)**:
```json
{
  "error": "Email já cadastrado"
}
```

---

## 📊 Resumo de Mudanças

### Arquivos Criados:
- `Backend/middlewares/authMiddleware.js` (118 linhas)
- `Backend/controllers/authController.js` (247 linhas)

### Arquivos Modificados:
- `Backend/.env` (+JWT_SECRET)
- `Backend/server.js` (refatoração completa de auth)
- `Frontend/scripts/main.js` (login, logout, registro com JWT)
- `Frontend/scripts/minha-conta.js` (envia token JWT)

### Arquivos Removidos:
- `Backend/auth.js` (obsoleto, substituído por authMiddleware.js)

### Dependências Adicionadas:
- `jsonwebtoken` (13 packages adicionados via npm)

---

## ✅ Checklist Final

Marque cada item após testar:

- [ ] Registro cria conta e retorna token JWT
- [ ] Login retorna token JWT
- [ ] Token é salvo no sessionStorage
- [ ] Logout remove token do sessionStorage
- [ ] Página Minha Conta carrega com token
- [ ] Rota protegida sem token retorna 401
- [ ] Token expirado retorna erro adequado
- [ ] Token inválido retorna erro adequado
- [ ] Renovação de token funciona
- [ ] Usuário só acessa própria conta (/api/account/:id)

---

## 🚀 Próximos Passos (Opcional)

1. **Refresh Token Automático**: Implementar renovação automática antes da expiração
2. **Blacklist de Tokens**: Invalidar tokens ao fazer logout
3. **Rate Limiting**: Limitar tentativas de login
4. **2FA**: Autenticação de dois fatores
5. **OAuth**: Login com Google/GitHub

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique se o servidor está rodando: `http://localhost:3000`
2. Verifique se JWT_SECRET está no .env
3. Verifique console do navegador (F12) para erros
4. Verifique logs do servidor no terminal

**Token Budget Status**: ✅ Sistema completo e funcional
