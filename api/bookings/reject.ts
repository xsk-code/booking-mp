// api/bookings/reject.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { requireBookingOwner, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { booking_id, reject_reason } = req.body;

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: '缺少预约ID参数'
      });
    }

    const user = await requireBookingOwner(req, booking_id);

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
        message: '只有待审核的预约才能拒绝'
      });
    }

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'rejected',
        reject_reason: reject_reason || '',
        reviewed_by: user.userId,
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
    console.error('拒绝预约失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '拒绝预约失败'
    });
  }
}
