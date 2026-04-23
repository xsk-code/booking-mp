// api/venues/list.ts
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
    const { data: venues, error } = await supabaseAnon
      .from('venues')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return res.status(200).json({
      success: true,
      venues: venues || []
    });

  } catch (error) {
    console.error('获取场地列表失败:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取场地列表失败'
    });
  }
}
