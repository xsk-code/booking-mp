// api/resources/list.ts
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
    const { venue_id } = req.query;

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        message: '缺少场地 ID'
      });
    }

    const { data: resources, error } = await supabaseAnon
      .from('resources')
      .select('*')
      .eq('venue_id', venue_id)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      resources: resources || []
    });

  } catch (error) {
    console.error('获取资源列表失败:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取资源列表失败'
    });
  }
}
