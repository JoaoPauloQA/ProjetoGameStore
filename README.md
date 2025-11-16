
# GameStore

E-commerce de jogos com frontend em HTML/CSS/JS, backend Node.js/Express, PostgreSQL para persistência, autenticação JWT e um chatbot inteligente baseado em intents. Estruturado para demonstrar domínio de arquitetura web completa, organização de código e fundamentos de testes / escalabilidade.

## 🎯 Visão Geral
Este projeto simula uma loja de jogos moderna:
- Catálogo de jogos com preço, imagem, plataformas e métricas de uso.
- Fluxo de compra com carrinho e criação de pedidos transacionais (orders + order_items).
- Histórico de compras unificado (compatibilidade com tabela legada).
- Autenticação segura (registro, login, verificação de sessão).
- Chatbot contextual com recuperação de senha, recomendação e suporte.


## 🧱 Arquitetura (Resumo)
- Frontend estático (HTML/JS) consumindo API REST.
- Backend Express gerencia rotas, autenticação e transações.
- PostgreSQL: modelo relacional otimizado com índices.
- Chatbot: engine de intents (arquivo de registro + core de roteamento).
- Scripts operacionais para inicialização, verificação e seed.

```
Frontend (HTML/JS) --> API (Express) --> PostgreSQL
					^              |  ^
					|              |  +-- Scripts (init/verify/seed)
					+-- Chatbot <--+
```

## 🧩 Tecnologias & Bibliotecas
- **Express**: camadas de rotas e integração de middlewares.
- **pg**: acesso ao PostgreSQL (pool de conexões).
- **bcrypt**: hash seguro de senhas.
- **jsonwebtoken**: emissão e validação de tokens.
- **dotenv**: configuração de ambiente.
- **cors**: habilitação de acesso cross-origin.
- **Vanilla JS**: simplicidade no frontend e controle direto do DOM.

## 🚀 Funcionalidades Implementadas
- Autenticação JWT (login, registro, sessão atual).
- Recuperação de senha via chatbot (fluxo guiado).
- Listagem de jogos: `/api/jogos`.
- Recomendação aleatória: `/api/jogos/recomendado`.
- Checkout transacional: cria `orders` + `order_items` garantindo consistência.
- Histórico de compras consolidado: `/api/compras/historico` ou `/api/orders/user/:id`.
- Seed Game Pass (upsert inteligente de assinaturas).
- Chatbot com intents: menu principal, histórico, ticket fictício, recomendação, suporte humano simulado.

## 🔐 Segurança
- Hash de senha com **bcrypt** (custo 10).
- Tokens JWT assinam contexto de usuário e protegem rotas (ex: checkout, histórico).
- Índices e constraints (CHECK / FK) evitam inserir dados inválidos.
- Uso restrito de transações para garantir atomicidade de compras.

## 🗄️ Banco de Dados (Schema Chave)
Tabelas principais:
- `usuarios(id, username, email, senha_hash, ...)`
- `jogos(id, title, price, platforms[], image, plays)`
- `orders(id, user_id, total_price, created_at)`
- `order_items(id, order_id, game_id, quantity)`
- (Legado) `compras` – ainda suportada para compatibilidade histórica.

Índices criados para acelerar busca por usuário e data em pedidos (`idx_orders_user_id`, `idx_orders_created_at`).

## 🔄 Fluxo de Checkout (Detalhe)
1. Frontend coleta itens e token do usuário.
2. Envia requisição autenticada para `/api/checkout`.
3. Backend inicia transação: cria linha em `orders`, insere cada item em `order_items`.
4. Total agregado persistido em `orders.total_price`.
5. Resposta retorna confirmação; histórico visível no chatbot e página Minha Conta.

## 🤖 Chatbot (Engine de Intents)
- Arquitetura separada: `chatbotCore.js` (estado / UI) + `chatbotIntents.js` (roteamento).
- Intents respondem a palavras-chave ou números do menu.
- Fluxos especiais: recuperação de senha, ticket e recomendação.
- Fácil extensão: adicionar nova intent como função exportada.

## 🧪 Testes & Qualidade
Estado atual:
- Scripts de smoke (`test-api`, `test-auth`, `verify-db`) para validação rápida.
- Estrutura pronta para incluir **Cypress** (E2E) + **Allure** (relatórios) + **BDD Gherkin**.

Roadmap de testes:
1. E2E: login → adicionar ao carrinho → checkout → histórico.
2. Chatbot: intents principais + fluxo de recuperação.
3. Segurança: rejeição de operações sem token válido.
4. API Contracts: validação de shape (ex: com Jest + Supertest).

## 📂 Estrutura do Código
```
Backend/
	server.js
	db.js
	controllers/
	routes/
	middlewares/
	scripts/          # init-db, init-users-db, create/verify orders, seeds, testes
	setup-*.sql        # scripts SQL de criação
frontend/
	index.html, login.html, checkout.html, minha-conta.html
	scripts/           # main.js, checkout.js, chatbotCore.js, chatbotIntents.js
	styles/            # CSS principal
database/            # schema e seed consolidado (evolução)
outros/              # documentação adicional
README.md            # este documento
```

## 🛠 Scripts Operacionais (Backend)
| Comando | Uso |
|---------|-----|
| `npm start` | Inicia API |
| `npm run seed:gamepass` | Upsert de assinaturas Game Pass |
| `node scripts/init-db.js` | Recria tabela `jogos` |
| `node scripts/init-users-db.js` | Recria `usuarios` |
| `node scripts/create-orders-tables.js` | Cria tabelas de pedidos |
| `node scripts/verify-orders-tables.js` | Verifica estrutura de pedidos |
| `node scripts/test-api.js` | Smoke público de rotas de jogos |
| `node scripts/test-auth.js` | Exercita fluxo auth |
| `node scripts/verify-db.js` | Confere conexão e imagens |

## 🔧 Decisões Técnicas
- Separação de scripts utilitários para reduzir poluição da raiz.
- Wrapper de compatibilidade para não quebrar comandos existentes.
- Fallback de histórico: garante continuidade durante migração de modelo.
- Uso de arrays (`platforms TEXT[]`) para flexibilidade de catálogo.
- Transações explícitas no checkout para evitar estados parciais.

## 📈 Possíveis Evoluções
- Testes E2E (Cypress) + Allure + Gherkin.
- Paginação e filtros avançados em `/api/jogos`.
- Cache de recomendações e top played (Redis).
- Rate-limiting e validação de payload (Joi / Celebrate).
- Internationalization (suporte multi‑idioma no frontend/chatbot).

## ▶️ Execução Local
```bash
git clone https://github.com/JoaoPauloQA/ProjetoGameStore.git
cd ProjetoGameStore/Backend
npm install
cp .env.example .env   # Ajustar DATABASE_URL e JWT_SECRET
npm start
```
Seed opcional:
```bash
npm run seed:gamepass
```
Abrir o frontend: abrir `frontend/index.html` no navegador.

## 📬 APIs Principais
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/jogos` | Lista jogos do catálogo |
| GET | `/api/jogos/recomendado` | Jogo aleatório |
| POST | `/api/auth/register` | Cria usuário |
| POST | `/api/auth/login` | Autentica e retorna JWT |
| GET | `/api/user/me` | Dados do usuário logado |
| POST | `/api/checkout` | Cria pedido (JWT) |
| GET | `/api/compras/historico` | Histórico unificado |
| GET | `/api/orders/user/:id` | Pedidos do usuário |

## 📊 Observabilidade Simples
Logs estruturados (console) + scripts de verificação permitem inspeção rápida sem ferramentas externas (útil em ambientes de desenvolvimento ou avaliação técnica).



## 👨‍💻 Autor
**João Paulo QA**  
QA Automation Engineer | Test Automation Enthusiast  
LinkedIn (inserir URL)  
📧 jopaulomartinsdacostaa@gmail.com

Esse é um projeto com fins exclusivamente acadêmico. 

