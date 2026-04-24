// api/auth/login.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { sign } from 'jsonwebtoken';
import { supabaseAdmin } from '../_utils/supabase';
import { code2Session } from '../_utils/wechat';

const JWT_SECRET = process.env.JWT_SECRET || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 code 参数'
      });
    }

    const session = await code2Session(code);
    const { openid, unionid } = session;

    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('openid', openid)
      .single();

    let user;
    let isNewUser = false;

    if (findError || !existingUser) {
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          openid,
          union_id: unionid,
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`创建用户失败: ${createError.message}`);
      }

      user = newUser;
      isNewUser = true;
    } else {
      user = existingUser;
    }

    const token = sign(
      {
        sub: user.id,
        openid: user.openid,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
      },
      JWT_SECRET
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        phone: user.phone
      },
      is_new_user: isNewUser
    });

  } catch (error) {
    console.error('登录失败:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || '登录失败'
    });
  }
}
