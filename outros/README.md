# Projeto GameStore

Estrutura reorganizada para separar backend, frontend e scripts de banco.

## Estrutura

- `Backend/`
  - `server.js`: API Express
  - `controllers/`, `routes/`, `middlewares/`, `database/`, `scripts/`
  - `db.js`: conexão PostgreSQL
  - `package.json`: scripts do backend
- `frontend/`
  - Páginas HTML e assets (CSS/JS) do site
- `database/`
  - `schema.sql`, `seed.sql`: criação e seed de dados
- `outros/`
  - `README.md`, `.env.example`, `.gitignore`

## Rodando o backend

```bash
cd Backend
npm install
npm start
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste `DATABASE_URL` e `JWT_SECRET`.

## Seeds

- Seed de Game Pass: `npm run seed:gamepass` (executa `Backend/scripts/seed-gamepass.js`)
