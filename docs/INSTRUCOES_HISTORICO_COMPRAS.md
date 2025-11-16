# 🛒 Histórico de Compras - Instruções de Instalação

## ✅ O QUE FOI IMPLEMENTADO

Duas novas funcionalidades foram adicionadas ao projeto GameStore:

### 1️⃣ **Registro de Compras no Banco de Dados**
- Todas as compras agora são salvas no PostgreSQL
- Criadas tabelas `orders` e `order_items`
- Suporte a carrinho com múltiplos itens
- Transações seguras (COMMIT/ROLLBACK)

### 2️⃣ **Histórico de Compras na Página Minha Conta**
- Nova seção visual na página `minha-conta.html`
- Exibe todas as compras do usuário logado
- Mostra: data, jogos comprados, quantidade e valor total
- Mensagem amigável quando não há compras

---

## 🚀 COMO INSTALAR

### **Passo 1: Executar o Script SQL**

⚠️ **IMPORTANTE:** Você precisa criar as tabelas `orders` e `order_items` no banco de dados PostgreSQL.

Execute o seguinte comando no terminal (PowerShell):

```powershell
# Navegue até a pasta Backend
cd d:\GameStore\Backend

# Execute o script SQL no PostgreSQL
psql -U seu_usuario -d seu_banco -f setup-orders.sql
```

**Substitua:**
- `seu_usuario` → seu usuário do PostgreSQL (ex: `postgres`)
- `seu_banco` → nome do seu banco de dados (ex: `gamestore`)

**Exemplo:**
```powershell
psql -U postgres -d gamestore -f setup-orders.sql
```

Se você estiver usando outro cliente PostgreSQL (pgAdmin, DBeaver, etc.), abra o arquivo `setup-orders.sql` e execute o conteúdo manualmente.

---

### **Passo 2: Reiniciar o Servidor Backend**

Após criar as tabelas, reinicie o servidor Node.js:

```powershell
cd d:\GameStore\Backend
node server.js
```

Você deve ver a mensagem:
```
Servidor rodando em http://localhost:3000
```

---

### **Passo 3: Testar o Fluxo Completo**

1. **Abra o navegador** em `http://localhost:3000` ou abra `index.html`
2. **Faça login** com suas credenciais
3. **Adicione jogos ao carrinho**
4. **Finalize a compra** no checkout
5. **Acesse "Minha Conta"** para ver o histórico de compras

---

## 📂 ARQUIVOS MODIFICADOS

### **Backend:**
- ✅ `Backend/setup-orders.sql` (NOVO) - Script de criação das tabelas
- ✅ `Backend/server.js` - Endpoint `/api/checkout` atualizado + novo endpoint `/api/orders/user/:id`

### **Frontend:**
- ✅ `frontend/minha-conta.html` - Nova seção de histórico de compras
- ✅ `frontend/scripts/minha-conta.js` - Função `loadOrderHistory()` adicionada
- ✅ `frontend/scripts/checkout.js` - Envia carrinho completo + token JWT

---

## 🔍 ESTRUTURA DAS TABELAS

### **Tabela `orders`** (Cabeçalho do pedido)
```sql
id           SERIAL PRIMARY KEY
user_id      INTEGER REFERENCES usuarios(id)
total_price  DECIMAL(10,2)
created_at   TIMESTAMP DEFAULT NOW()
```

### **Tabela `order_items`** (Itens do pedido)
```sql
id        SERIAL PRIMARY KEY
order_id  INTEGER REFERENCES orders(id)
game_id   INTEGER REFERENCES jogos(id)
quantity  INTEGER
```

---

## 🛡️ SEGURANÇA E VALIDAÇÃO

✔️ **Autenticação JWT obrigatória** para checkout e histórico
✔️ **Transações SQL** garantem consistência dos dados
✔️ **Usuário só acessa suas próprias compras** (validação por user_id)
✔️ **Carrinho é limpo** automaticamente após compra bem-sucedida
✔️ **Índices otimizados** para consultas rápidas

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### Erro: "relation 'orders' does not exist"
➡️ **Solução:** Você não executou o script SQL. Execute o Passo 1.

### Erro: "401 Unauthorized" no checkout
➡️ **Solução:** Seu token JWT expirou. Faça login novamente.

### Histórico não aparece mesmo após comprar
➡️ **Solução:** Verifique se as tabelas foram criadas corretamente e se o servidor foi reiniciado.

### Erro: "cannot insert into orders" 
➡️ **Solução:** Verifique se o usuário logado existe na tabela `usuarios`.

---

## 📝 OBSERVAÇÕES IMPORTANTES

- ⚠️ O checkout **agora exige autenticação via JWT**
- ⚠️ O endpoint `/api/checkout` foi **modificado** mas mantém retrocompatibilidade
- ✅ Todas as funcionalidades antigas continuam funcionando
- ✅ O chatbot continua exibindo o protocolo após a compra
- ✅ Código está comentado e organizado para facilitar manutenção

---

## ✅ CONCLUSÃO

Após seguir os passos acima, você terá:

1. ✅ Compras registradas no banco de dados PostgreSQL
2. ✅ Histórico visual completo na página "Minha Conta"
3. ✅ Sistema totalmente funcional e seguro com JWT
4. ✅ Código limpo, comentado e organizado

**Pronto para usar!** 🎮🚀

---

**Desenvolvido com atenção aos detalhes e boas práticas de programação.**
