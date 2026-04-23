// api/bookings/create.ts
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

    const {
      resource_id,
      booking_date,
      start_time,
      end_time,
      guest_count,
      contact_name,
      contact_phone,
      remark
    } = req.body;

    // 参数校验
    if (!resource_id || !booking_date || !start_time || !end_time || !contact_name || !contact_phone) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 1. 获取资源信息以获取 venue_id
    const { data: resource, error: resourceError } = await supabaseAdmin
      .from('resources')
      .select('venue_id')
      .eq('id', resource_id)
      .single();

    if (resourceError || !resource) {
      return res.status(404).json({
        success: false,
        message: '资源不存在'
      });
    }

    // 2. 检查时段是否已被预约（利用数据库唯一索引）
    try {
      const { data: booking, error: createError } = await supabaseAdmin
        .from('bookings')
        .insert({
          user_id: user.userId,
          resource_id,
          venue_id: resource.venue_id,
          booking_date,
          start_time,
          end_time,
          guest_count: guest_count || 1,
          contact_name,
          contact_phone,
          remark: remark || '',
          status: 'pending'
        })
        .select()
        .single();

      if (createError) {
        // 检查是否是唯一约束冲突（时段已被预约）
        if (createError.code === '23505') {
          return res.status(409).json({
            success: false,
            message: '该时段已被预约，请选择其他时段'
          });
        }
        throw createError;
      }

      return res.status(200).json({
        success: true,
        booking
      });

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('创建预约失败:', error);
    
    // 处理认证错误
    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '创建预约失败'
    });
  }
}
