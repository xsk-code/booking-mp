// api/bookings/list.ts
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
    // 认证用户
    const user = authenticate(req);

    const { status } = req.query;

    // 构建查询
    let query = supabaseAdmin
      .from('bookings')
      .select(`
        *,
        resources(name)
      `)
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // 格式化返回数据
    const formattedBookings = (bookings || []).map(booking => ({
      ...booking,
      resource_name: booking.resources?.name
    }));

    return res.status(200).json({
      success: true,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error('获取预约列表失败:', error);
    
    // 处理认证错误
    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取预约列表失败'
    });
  }
}
