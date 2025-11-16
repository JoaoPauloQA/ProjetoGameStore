/**
 * Controlador de Autenticação
 * 
 * Gerencia todas as operações relacionadas à autenticação:
 * - Registro de novos usuários
 * - Login e geração de JWT
 * - Validação de tokens
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

/**
 * Gera um token JWT para o usuário
 * @param {Object} user - Dados do usuário (id, email, username)
 * @returns {string} Token JWT
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username
  };
  
  // Token expira em 24 horas (você pode ajustar conforme necessário)
  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '24h' 
  });
}

/**
 * POST /api/auth/register
 * Registra um novo usuário no sistema
 */
async function register(req, res) {
  const { username, email, password, nome_completo } = req.body;

  try {
    // 1. Validação dos campos obrigatórios
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Campos obrigatórios faltando',
        message: 'Username, email e password são obrigatórios' 
      });
    }

    // 2. Validação de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Email inválido',
        message: 'Por favor, forneça um email válido' 
      });
    }

    // 3. Validação de senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: 'Senha muito curta',
        message: 'A senha deve ter no mínimo 6 caracteres' 
      });
    }

    // 4. Verificar se o usuário já existe
    const userCheck = await pool.query(
      'SELECT id FROM usuarios WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'Usuário já existe',
        message: 'Username ou email já cadastrado' 
      });
    }

    // 5. Hash da senha com bcrypt (10 rounds de salt)
    const saltRounds = 10;
    const senha_hash = await bcrypt.hash(password, saltRounds);

    // 6. Inserir o novo usuário no banco
    const result = await pool.query(
      `INSERT INTO usuarios (username, email, senha_hash, nome_completo) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, nome_completo, created_at`,
      [username, email, senha_hash, nome_completo || null]
    );

    const newUser = result.rows[0];

    // 7. Gerar token JWT para login automático após registro
    const token = generateToken(newUser);

    console.log('✅ Novo usuário cadastrado:', newUser.username);

    // 8. Retornar sucesso com token e dados do usuário
    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso!',
      token: token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nome_completo: newUser.nome_completo,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao cadastrar usuário',
      message: error.message 
    });
  }
}

/**
 * POST /api/auth/login
 * Autentica usuário e retorna token JWT
 */
async function login(req, res) {
  const { email, username, password } = req.body;
  const identifier = (email || username || '').trim();

  try {
    // 1. Validação dos campos obrigatórios
    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Campos obrigatórios faltando',
        message: 'Email/username e password são obrigatórios' 
      });
    }

    // 2. Buscar o usuário no banco
    const result = await pool.query(
      'SELECT id, username, email, senha_hash, nome_completo FROM usuarios WHERE username = $1 OR email = $1',
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais inválidas',
        message: 'Usuário ou senha incorretos' 
      });
    }

    const user = result.rows[0];

    // 3. Verificar a senha com bcrypt
    const senhaValida = await bcrypt.compare(password, user.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciais inválidas',
        message: 'Usuário ou senha incorretos' 
      });
    }

    // 4. Gerar token JWT
    const token = generateToken(user);

    console.log('✅ Login bem-sucedido:', user.username);

    // 5. Retornar token e dados do usuário
    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nome_completo: user.nome_completo
      }
    });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao fazer login',
      message: error.message 
    });
  }
}

/**
 * GET /api/auth/verify
 * Verifica se o token JWT é válido e retorna dados do usuário
 * Requer middleware authMiddleware
 */
async function verifyToken(req, res) {
  try {
    // O middleware já validou o token e adicionou req.userId
    const userId = req.userId;

    // Buscar dados atualizados do usuário
    const result = await pool.query(
      'SELECT id, username, email, nome_completo, created_at FROM usuarios WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado' 
      });
    }

    return res.json({
      success: true,
      message: 'Token válido',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao verificar token',
      message: error.message 
    });
  }
}

/**
 * POST /api/auth/refresh
 * Gera um novo token JWT para o usuário autenticado
 * Útil para renovar tokens antes de expirarem
 */
async function refreshToken(req, res) {
  try {
    const userId = req.userId;

    // Buscar dados do usuário
    const result = await pool.query(
      'SELECT id, username, email FROM usuarios WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuário não encontrado' 
      });
    }

    // Gerar novo token
    const newToken = generateToken(result.rows[0]);

    return res.json({
      success: true,
      message: 'Token renovado com sucesso',
      token: newToken
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao renovar token',
      message: error.message 
    });
  }
}

module.exports = {
  register,
  login,
  verifyToken,
  refreshToken
};
