// api/admin/bookings/pending.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';
import { requireAdmin, handleAuthError } from '../../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    // 认证管理员
    const admin = requireAdmin(req);

    // 获取待审核预约列表
    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        users(nickname, phone),
        resources(name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    // 格式化返回数据
    const formattedBookings = (bookings || []).map(booking => ({
      ...booking,
      user_nickname: booking.users?.nickname,
      user_phone: booking.users?.phone,
      resource_name: booking.resources?.name
    }));

    return res.status(200).json({
      success: true,
      bookings: formattedBookings
    });

  } catch (error) {
    console.error('获取待审核预约列表失败:', error);
    
    // 处理认证错误
    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取待审核预约列表失败'
    });
  }
}
