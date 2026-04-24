// api/time-slots/toggle.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { handleAuthError, AuthError, authenticate } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const user = authenticate(req);
    const { slot_id, is_available } = req.body;

    if (!slot_id) {
      return res.status(400).json({
        success: false,
        message: '缺少时段ID参数'
      });
    }

    const { data: timeSlot, error: slotError } = await supabaseAdmin
      .from('resource_time_slots')
      .select(`
        resource_id,
        resources!inner(
          venue_id,
          venues!inner(creator_id)
        )
      `)
      .eq('id', slot_id)
      .single();

    if (slotError || !timeSlot) {
      throw new AuthError('时段不存在');
    }

    const resources = (timeSlot as any).resources;
    const venues = resources?.venues;
    
    if (!venues || venues.creator_id !== user.userId) {
      throw new AuthError('无权限：仅场地所有者可操作');
    }

    const { error: updateError } = await supabaseAdmin
      .from('resource_time_slots')
      .update({ is_available: is_available !== false })
      .eq('id', slot_id);

    if (updateError) {
      throw new Error(`更新时段状态失败: ${updateError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: '时段状态已更新'
    });

  } catch (error) {
    console.error('切换时段状态失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '切换时段状态失败'
    });
  }
}
