// api/bookings/pending-list.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { requireVenueOwner, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { venue_id, limit } = req.query;

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        message: '缺少场地ID参数'
      });
    }

    await requireVenueOwner(req, venue_id as string);

    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users:user_id(nickname, phone),
        resources:resource_id(name)
      `)
      .eq('venue_id', venue_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(parseInt(limit as string));
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const formattedBookings = (bookings || []).map(booking => ({
      ...booking,
      user_nickname: (booking as any).users?.nickname,
      user_phone: (booking as any).users?.phone,
      resource_name: (booking as any).resources?.name
    }));

    return res.status(200).json({
      success: true,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error('获取待审核预约列表失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取待审核预约列表失败'
    });
  }
}
