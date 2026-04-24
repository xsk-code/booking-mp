// api/stats/overview.ts
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
    const { venue_id } = req.query;

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        message: '缺少场地ID参数'
      });
    }

    await requireVenueOwner(req, venue_id as string);

    const today = new Date().toISOString().split('T')[0];

    const [
      pendingCountResult,
      todayCountResult,
      approvedCountResult,
      totalCountResult
    ] = await Promise.all([
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venue_id)
        .eq('status', 'pending'),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venue_id)
        .eq('booking_date', today),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venue_id)
        .eq('status', 'approved'),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', venue_id)
    ]);

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

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取统计数据失败'
    });
  }
}
