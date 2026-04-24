// api/time-slots/save.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { requireResourceOwner, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { resource_id, slots } = req.body;

    if (!resource_id) {
      return res.status(400).json({
        success: false,
        message: '缺少资源ID参数'
      });
    }

    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({
        success: false,
        message: '缺少时段数据'
      });
    }

    await requireResourceOwner(req, resource_id);

    const { error: deleteError } = await supabaseAdmin
      .from('resource_time_slots')
      .delete()
      .eq('resource_id', resource_id);

    if (deleteError) {
      throw new Error(`删除旧时段失败: ${deleteError.message}`);
    }

    if (slots.length > 0) {
      const newSlots = slots.map((slot: any) => ({
        resource_id,
        weekday: slot.weekday,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available !== false
      }));

      const { data: insertedSlots, error: insertError } = await supabaseAdmin
        .from('resource_time_slots')
        .insert(newSlots)
        .select();

      if (insertError) {
        throw new Error(`插入新时段失败: ${insertError.message}`);
      }

      return res.status(200).json({
        success: true,
        time_slots: insertedSlots || []
      });
    }

    return res.status(200).json({
      success: true,
      time_slots: []
    });

  } catch (error) {
    console.error('保存时段失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '保存时段失败'
    });
  }
}
