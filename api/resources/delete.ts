// api/resources/delete.ts
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
    const { resource_id } = req.body;

    if (!resource_id) {
      return res.status(400).json({
        success: false,
        message: '缺少资源ID参数'
      });
    }

    await requireResourceOwner(req, resource_id);

    const { data: activeBookings, error: checkError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('resource_id', resource_id)
      .in('status', ['pending', 'approved'])
      .limit(1);

    if (checkError) {
      throw new Error(`检查预约状态失败: ${checkError.message}`);
    }

    if (activeBookings && activeBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该资源存在进行中的预约，无法删除'
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('resources')
      .delete()
      .eq('id', resource_id);

    if (deleteError) {
      throw new Error(`删除资源失败: ${deleteError.message}`);
    }

    return res.status(200).json({
      success: true,
      message: '资源已删除'
    });

  } catch (error) {
    console.error('删除资源失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '删除资源失败'
    });
  }
}
