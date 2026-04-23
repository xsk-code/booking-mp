// api/_utils/auth.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthUser {
  userId: string;
  role: 'user' | 'admin';
}

// 认证错误类
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// 认证中间件
export function authenticate(req: VercelRequest): AuthUser {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AuthError('未登录');
  }

  try {
    const payload = verify(token, JWT_SECRET) as any;
    return {
      userId: payload.sub,
      role: payload.role || 'user'
    };
  } catch (error) {
    throw new AuthError('token 无效或已过期');
  }
}

// 管理员权限检查
export function requireAdmin(req: VercelRequest): AuthUser {
  const user = authenticate(req);
  
  if (user.role !== 'admin') {
    throw new AuthError('无管理员权限');
  }
  
  return user;
}

// 处理认证错误
export function handleAuthError(res: VercelResponse, error: Error) {
  if (error instanceof AuthError) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
  return res.status(500).json({
    success: false,
    message: '服务器错误'
  });
}
