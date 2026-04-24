// api/venues/my-venues.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { authenticate, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const user = authenticate(req);

    const { data: venues, error } = await supabaseAdmin
      .from('venues')
      .select(`
        *,
        resources:resources(count)
      `)
      .eq('creator_id', user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const formattedVenues = (venues || []).map(venue => ({
      ...venue,
      resource_count: (venue as any).resources?.[0]?.count || 0
    }));

    return res.status(200).json({
      success: true,
      venues: formattedVenues
    });

  } catch (error) {
    console.error('获取我的场地列表失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取我的场地列表失败'
    });
  }
}
