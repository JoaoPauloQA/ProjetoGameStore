# Projeto GameStore — Guia de Testes de API (Postman e Rest Assured)

Este documento consolida todas as rotas expostas pelo backend, como testar com Postman e como automatizar com Rest Assured (Java). Inclui casos positivos/negativos, requisitos de autenticação (JWT) e exemplos práticos.

- Base URL (local): `http://localhost:3000`
- Linguagem/Stack: Node.js + Express + PostgreSQL
- Autenticação: JWT (header `Authorization: Bearer <token>`)
- Pré-requisitos: `.env` com `DATABASE_URL` e `JWT_SECRET`. Opcional `RAWG_API_KEY` (para endpoints proxy RAWG).

## Executando o backend

```powershell
cd d:\GameStore\Backend
npm install
$env:JWT_SECRET = "sua_chave_super_secreta"   # ou use um arquivo .env
# opcional: $env:RAWG_API_KEY = "<sua-chave>"
npm start
```

Verifique rotas registradas: `GET http://localhost:3000/__routes`.

---

## Autenticação (JWT)

- `POST /api/auth/register` — Cadastra usuário e retorna `token`.
- `POST /api/auth/login` — Faz login (por `username` ou `email`) e retorna `token`.
- `GET /api/auth/verify` — Verifica token (PROTEGIDA, requer JWT).
- `POST /api/auth/refresh` — Renova token (PROTEGIDA, requer JWT).

Campos comuns:
- Register body: `{ "username": "string", "email": "string", "password": "min 6", "nome_completo": "string?" }`
- Login body: `{ "username": "string" OR "email": "string", "password": "string" }`

Notas:
- Ambiente inclui usuário seed: `admin / 123456` (ver `setup-users.sql`).
- O token expira em 24h.

### Exemplos Postman
- Register:
  - Method: POST
  - URL: `{{baseUrl}}/api/auth/register`
  - Body (JSON):
    ```json
    {
      "username": "qa_user",
      "email": "qa_user@gamestore.com",
      "password": "123456",
      "nome_completo": "QA User"
    }
    ```
- Login:
  - Method: POST
  - URL: `{{baseUrl}}/api/auth/login`
  - Body (JSON):
    ```json
    {
      "username": "admin",
      "password": "123456"
    }
    ```
  - Salve `token` da resposta em variável de ambiente `token`.
- Verify:
  - Method: GET
  - URL: `{{baseUrl}}/api/auth/verify`
  - Headers: `Authorization: Bearer {{token}}`
- Refresh:
  - Method: POST
  - URL: `{{baseUrl}}/api/auth/refresh`
  - Headers: `Authorization: Bearer {{token}}`

### Exemplos Rest Assured (Java)

Dependência (Maven):
```xml
<dependency>
  <groupId>io.rest-assured</groupId>
  <artifactId>rest-assured</artifactId>
  <version>5.4.0</version>
  <scope>test</scope>
</dependency>
```

Login e armazenar token:
```java
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;
import io.restassured.http.ContentType;

String baseUrl = "http://localhost:3000";
String token =
  given()
    .baseUri(baseUrl)
    .contentType(ContentType.JSON)
    .body("{\"username\":\"admin\",\"password\":\"123456\"}")
  .when()
    .post("/api/auth/login")
  .then()
    .statusCode(200)
    .body("success", equalTo(true))
    .extract().path("token");
```

Verify com token:
```java
given()
  .baseUri(baseUrl)
  .header("Authorization", "Bearer " + token)
.when()
  .get("/api/auth/verify")
.then()
  .statusCode(200)
  .body("success", equalTo(true));
```

Casos negativos:
```java
// login faltando campos
given().baseUri(baseUrl).contentType(ContentType.JSON)
  .body("{\"username\":\"admin\"}")
.when().post("/api/auth/login")
.then().statusCode(400);

// verify sem token
given().baseUri(baseUrl)
.when().get("/api/auth/verify")
.then().statusCode(401);
```

---

## Jogos e Catálogo

- `GET /api/jogos` — Lista jogos do banco (PostgreSQL).
- `GET /api/games` — Alias para `/api/jogos`.
- `GET /api/top-played?limit=5` — Top jogos por `plays`.
- `GET /api/games/search?q=<texto>&limit=8` — Busca por título.
- `GET /api/gamepass` — Produtos contendo "gamepass" no título.
- `GET /api/games/:id/details` — Detalhes do jogo (proxy RAWG, simplificado).
- `GET /api/games/popular` — Top 10 populares (RAWG).

Respostas típicas:
- `/api/jogos` item: `{ id, title, price, platforms[], image, plays }`
- `/api/games/search`: `[ { id, title, price, image } ]`
- `/api/games/:id/details`:
  ```json
  {
    "id": 3328,
    "name": "The Witcher 3: Wild Hunt",
    "description_raw": "...",
    "genres": ["RPG", "Open World"],
    "platforms": ["PC", "PlayStation 4"],
    "rating": 4.7,
    "background_image": "https://..."
  }
  ```

Casos de teste:
- 200: listar jogos, buscar por `q` existente.
- 404/empty: `search` com termo inexistente retorna `[]`.
- RAWG indisponível: `games/:id/details` e `games/popular` podem retornar 502/500 — validar mensagem de erro.
- Validação de query params: `limit` máximo e tipos numéricos.

### Rest Assured exemplos (públicos)
```java
// lista jogos
given().baseUri(baseUrl)
.when().get("/api/jogos")
.then().statusCode(200).body("size()", greaterThan(0));

// busca
given().baseUri(baseUrl)
  .queryParam("q", "witcher")
  .queryParam("limit", 5)
.when().get("/api/games/search")
.then().statusCode(200).body("size()", lessThanOrEqualTo(5));
```

---

## Checkout e Suporte

- `POST /api/checkout` — Processa compra. Dois formatos suportados:
  1) Novo fluxo: body com `formaPagamento` (e opcionais `nome`, `email`, `cep`, `cupom`). Retorna `{ sucesso, mensagem, protocolo }`.
  2) Legado: body somente com `gameId` — retorna `{ message, order }`.

Exemplos:
```json
// novo fluxo
{
  "gameId": 2,
  "formaPagamento": "PIX",
  "nome": "Cliente QA",
  "email": "cliente@example.com",
  "cep": "01001-000",
  "cupom": "QA10"
}
```

Casos de teste:
- 200 novo fluxo: com `formaPagamento` válida, retorna protocolo `#CHKxxxxxx`.
- 200 legado: com `gameId` existente e sem `formaPagamento`.
- 404 legado: `gameId` inexistente.
- 400: sem `formaPagamento` e sem `gameId`.

- `POST /api/support/ticket` — Cria ticket de suporte.
  - Body: `{ name, email, subject?, message }`
  - Resposta: `{ status: "ok", protocolo: "#2xxxx", mensagem }`

Casos negativos:
- 400 se `name|email|message` ausentes.

### Rest Assured exemplos (checkout)
```java
// novo fluxo
given().baseUri(baseUrl).contentType(ContentType.JSON)
  .body("{\"gameId\":2,\"formaPagamento\":\"PIX\"}")
.when().post("/api/checkout")
.then().statusCode(200).body("sucesso", equalTo(true)).body("protocolo", startsWith("#CHK"));

// inválido
given().baseUri(baseUrl).contentType(ContentType.JSON)
  .body("{}")
.when().post("/api/checkout")
.then().statusCode(400);
```

---

## Conta do Usuário (PROTEGIDO)

- `GET /api/user/me` — Dados básicos do usuário autenticado.
  - Headers: `Authorization: Bearer <token>`
  - Resposta: `{ nome, email, created_at }`

- `GET /api/account/:id` — Dados da conta + últimas compras (se tabela existir).
  - Protegido por JWT; usuário só pode acessar seu próprio `:id` (comparado ao `req.userId`).
  - 403 se `:id` != `userId` do token.

### Postman
- Configure variável `token` após login.
- Use `Authorization: Bearer {{token}}` nos pedidos protegidos.

### Rest Assured exemplos (protegidos)
```java
// me
given().baseUri(baseUrl)
  .header("Authorization", "Bearer " + token)
.when().get("/api/user/me")
.then().statusCode(200).body("email", notNullValue());

// account (id do token)
int myId =
  given().baseUri(baseUrl)
    .header("Authorization", "Bearer " + token)
  .when().get("/api/auth/verify")
  .then().statusCode(200)
  .extract().path("user.id");

given().baseUri(baseUrl)
  .header("Authorization", "Bearer " + token)
.when().get("/api/account/" + myId)
.then().statusCode(200).body("user.id", equalTo(myId));

// 403 acesso de outro id
int otherId = myId + 1;
given().baseUri(baseUrl)
  .header("Authorization", "Bearer " + token)
.when().get("/api/account/" + otherId)
.then().statusCode(403);
```

---

## RAWG Proxies (Dependência Externa)

- `GET /api/rawg-games?search=<q>&page_size=10&page=1`
- `GET /api/games/popular`
- `GET /api/rawg-news?search=<q>&page_size=5&page=1`

Observações de teste:
- Podem falhar por rate limit / ausência de `RAWG_API_KEY`.
- Backend retorna 500/502 com detalhes; valide mensagens de erro e códigos.

---

## Matriz de Casos (Resumo)

- Autenticação
  - 201 register válido; 409 duplicado; 400 campos inválidos.
  - 200 login válido; 401 credenciais inválidas; 400 campos faltando.
  - 200 verify válido; 401 sem token; 401 token inválido/expirado.
  - 200 refresh válido; 401 sem token.
- Públicos
  - 200 jogos; 200 search com limite; 200 top-played com `limit`; 200 gamepass.
  - RAWG: 200 com chave; 500/502 sem chave/erro externo.
- Checkout e Suporte
  - 200 checkout novo fluxo; 200/404 legado; 400 request inválido.
  - 200 suporte com protocolo; 400 campos obrigatórios faltando.
- Protegidos
  - 200 me com token; 404 se usuário não existir (edge); 401 sem token.
  - 200 account/:id com id do token; 403 outro id; 404 usuário não encontrado.

---

## Postman — Dicas Rápidas

- Crie um Environment com:
  - `baseUrl = http://localhost:3000`
  - `token = <atualizado pelo login>`
- Test Script (na requisição de login) para guardar o token:
```js
const token = pm.response.json().token;
if (token) { pm.environment.set("token", token); }
```
- Colete exemplos (Examples) para gerar documentação automática.

---

## Observações e Rotas Extras

- `GET /__routes` — Debug: lista rotas registradas (não é parte pública da API, útil para QA).
- `ANY /api/*` inexistente retorna `404` com `{ error: 'API route not found', path }` — valide erro 404.

---

## Anexos (opcional)

- Scripts utilitários no repositório:
  - `Backend/scripts/test-api.js` (teste simples de GETs públicos)
  - `Backend/scripts/test-auth.js` (exemplo legada; atenção: rota `GET /api/auth/verify/admin` não existe mais — usar `GET /api/auth/verify` com JWT)

Boa bateria de testes! Ajuste os testes conforme seu ambiente (chave RAWG, seed de dados, etc.).
