// api/resources/update.ts
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
    const { resource_id, ...updateFields } = req.body;

    if (!resource_id) {
      return res.status(400).json({
        success: false,
        message: '缺少资源ID参数'
      });
    }

    await requireResourceOwner(req, resource_id);

    const updates: any = {};

    const allowedFields = [
      'name', 'type', 'capacity', 'description',
      'price', 'sort_order', 'status'
    ];

    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updates[field] = updateFields[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段'
      });
    }

    const { data: resource, error } = await supabaseAdmin
      .from('resources')
      .update(updates)
      .eq('id', resource_id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新资源失败: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      resource
    });

  } catch (error) {
    console.error('更新资源失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '更新资源失败'
    });
  }
}
