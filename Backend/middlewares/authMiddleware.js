/**
 * Middleware de Autenticação JWT
 * 
 * Este middleware valida o token JWT enviado no header Authorization
 * e protege rotas que requerem autenticação.
 * 
 * Uso: Adicione este middleware em rotas que precisam de autenticação
 * Exemplo: app.get('/api/protected', authMiddleware, (req, res) => {...})
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware principal de autenticação
 * Verifica se o token JWT é válido e extrai os dados do usuário
 */
function authMiddleware(req, res, next) {
  try {
    // 1. Extrair token do header Authorization
    // Formato esperado: "Bearer <token>"
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Acesso negado',
        message: 'Token de autenticação não fornecido' 
      });
    }

    // 2. Separar "Bearer" do token
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ 
        error: 'Token malformado',
        message: 'Formato do token inválido. Use: Bearer <token>' 
      });
    }

    const token = parts[1];

    // 3. Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Adicionar dados do usuário ao request
    // Agora todas as rotas protegidas terão acesso a req.user
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userName = decoded.username;
    
    // 5. Continuar para a próxima função (rota)
    return next();
    
  } catch (error) {
    // Token inválido ou expirado
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Seu token de autenticação expirou. Faça login novamente.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Token de autenticação inválido' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Falha na autenticação',
      message: error.message 
    });
  }
}

/**
 * Middleware opcional para rotas que podem funcionar com ou sem autenticação
 * Se o token existir, valida. Se não existir, continua sem req.userId
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next(); // Sem token, mas permite continuar
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      req.userEmail = decoded.email;
      req.userName = decoded.username;
    }
    
    return next();
  } catch (error) {
    // Ignora erros e continua sem autenticação
    return next();
  }
}

module.exports = { 
  authMiddleware, 
  optionalAuth 
};
