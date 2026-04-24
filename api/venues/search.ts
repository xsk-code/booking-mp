// api/venues/search.ts
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
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少场地码参数'
      });
    }

    const venueCode = (code as string).toUpperCase().trim();

    const { data: venue, error } = await supabaseAnon
      .from('venues')
      .select('*')
      .eq('venue_code', venueCode)
      .eq('status', 'active')
      .single();

    if (error || !venue) {
      return res.status(404).json({
        success: false,
        message: '场地不存在或已停用'
      });
    }

    return res.status(200).json({
      success: true,
      venue
    });

  } catch (error) {
    console.error('搜索场地失败:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || '搜索场地失败'
    });
  }
}
