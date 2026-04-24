// api/time-slots/list.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { requireResourceOwner, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { resource_id } = req.query;

    if (!resource_id) {
      return res.status(400).json({
        success: false,
        message: '缺少资源ID参数'
      });
    }

    await requireResourceOwner(req, resource_id as string);

    const { data: timeSlots, error } = await supabaseAdmin
      .from('resource_time_slots')
      .select('*')
      .eq('resource_id', resource_id)
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      time_slots: timeSlots || []
    });

  } catch (error) {
    console.error('获取时段列表失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取时段列表失败'
    });
  }
}
