// api/venues/detail.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAnon } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: '缺少场地 ID'
      });
    }

    const { data: venue, error } = await supabaseAnon
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: '场地不存在'
      });
    }

    return res.status(200).json({
      success: true,
      venue
    });

  } catch (error) {
    console.error('获取场地详情失败:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取场地详情失败'
    });
  }
}
