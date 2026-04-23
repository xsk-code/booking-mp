// api/admin/bookings/approve.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_utils/supabase';
import { requireAdmin, handleAuthError } from '../../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    // 认证管理员
    const admin = requireAdmin(req);

    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: '缺少预约 ID'
      });
    }

    // 检查预约是否存在且状态为 pending
    const { data: booking, error: findError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (findError || !booking) {
      return res.status(404).json({
        success: false,
        message: '预约不存在'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只有待审核的预约才能通过'
      });
    }

    // 通过预约
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'approved',
        reviewed_by: admin.userId,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return res.status(200).json({
      success: true,
      booking: updatedBooking
    });

  } catch (error) {
    console.error('通过预约失败:', error);
    
    // 处理认证错误
    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '通过预约失败'
    });
  }
}
