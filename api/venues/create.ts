// api/venues/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { authenticate, handleAuthError, AuthError } from '../_utils/auth';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateVenueCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

async function generateUniqueVenueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateVenueCode();
    const { data, error } = await supabaseAdmin
      .from('venues')
      .select('id')
      .eq('venue_code', code)
      .single();

    if (error || !data) {
      return code;
    }
  }
  throw new Error('生成场地码失败，请稍后重试');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const user = authenticate(req);

    const {
      name,
      address,
      description,
      contact_phone,
      business_start = '09:00',
      business_end = '22:00',
      slot_duration = 120
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '场地名称不能为空'
      });
    }

    const venueCode = await generateUniqueVenueCode();

    const { data: venue, error } = await supabaseAdmin
      .from('venues')
      .insert({
        venue_code: venueCode,
        name,
        address,
        description,
        contact_phone,
        business_start,
        business_end,
        slot_duration,
        creator_id: user.userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建场地失败: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      venue
    });

  } catch (error) {
    console.error('创建场地失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '创建场地失败'
    });
  }
}
