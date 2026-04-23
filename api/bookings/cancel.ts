// api/bookings/cancel.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { authenticate, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    // 认证用户
    const user = authenticate(req);

    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: '缺少预约 ID'
      });
    }

    // 1. 检查预约是否存在且属于当前用户
    const { data: booking, error: findError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('user_id', user.userId)
      .single();

    if (findError || !booking) {
      return res.status(404).json({
        success: false,
        message: '预约不存在'
      });
    }

    // 2. 检查状态是否可取消
    if (!['pending', 'approved'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: '该预约无法取消'
      });
    }

    // 3. 取消预约
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'cancelled'
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
    console.error('取消预约失败:', error);
    
    // 处理认证错误
    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '取消预约失败'
    });
  }
}
