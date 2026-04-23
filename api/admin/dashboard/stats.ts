// api/admin/dashboard/stats.ts
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
    requireAdmin(req);

    const today = new Date().toISOString().split('T')[0];

    // 并行获取统计数据
    const [
      pendingCountResult,
      todayCountResult,
      approvedCountResult,
      totalCountResult
    ] = await Promise.all([
      // 待审核数量
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'pending'),
      // 今日预约数量
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('booking_date', today),
      // 已通过数量
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'approved'),
      // 总预约数量
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact' })
    ]);

    // 统计通过率
    const totalApproved = approvedCountResult.count || 0;
    const total = totalCountResult.count || 0;
    const approvalRate = total > 0 ? Math.round((totalApproved / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      stats: {
        pending_count: pendingCountResult.count || 0,
        today_count: todayCountResult.count || 0,
        approved_count: totalApproved,
        total_count: total,
        approval_rate: approvalRate
      }
    });

  } catch (error) {
    console.error('获取统计数据失败:', error);
    
    // 处理认证错误
    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取统计数据失败'
    });
  }
}
