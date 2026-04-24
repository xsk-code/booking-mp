// api/resources/create.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { requireVenueOwner, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const {
      venue_id,
      name,
      type = 'room',
      capacity = 1,
      description,
      price,
      sort_order = 0
    } = req.body;

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        message: '缺少场地ID参数'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '资源名称不能为空'
      });
    }

    await requireVenueOwner(req, venue_id);

    const { data: resource, error } = await supabaseAdmin
      .from('resources')
      .insert({
        venue_id,
        name,
        type,
        capacity,
        description,
        price,
        sort_order,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`创建资源失败: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      resource
    });

  } catch (error) {
    console.error('创建资源失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '创建资源失败'
    });
  }
}
