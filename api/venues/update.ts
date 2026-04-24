// api/venues/update.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_utils/supabase';
import { requireVenueOwner, handleAuthError } from '../_utils/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { venue_id, venue_code, ...updateFields } = req.body;

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        message: '缺少场地ID参数'
      });
    }

    await requireVenueOwner(req, venue_id);

    const updates: any = {};

    const allowedFields = [
      'name', 'address', 'description', 'contact_phone',
      'business_start', 'business_end', 'slot_duration', 'status'
    ];

    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updates[field] = updateFields[field];
      }
    }

    if (venue_code) {
      const trimmedCode = venue_code.toUpperCase().trim();
      
      if (trimmedCode.length < 4 || trimmedCode.length > 16) {
        return res.status(400).json({
          success: false,
          message: '场地码长度应为4-16位'
        });
      }

      if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
        return res.status(400).json({
          success: false,
          message: '场地码只能包含大写字母和数字'
        });
      }

      const { data: existingVenue, error: checkError } = await supabaseAdmin
        .from('venues')
        .select('id')
        .eq('venue_code', trimmedCode)
        .neq('id', venue_id)
        .single();

      if (existingVenue) {
        return res.status(400).json({
          success: false,
          message: '该场地码已被使用'
        });
      }

      updates.venue_code = trimmedCode;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段'
      });
    }

    const { data: venue, error } = await supabaseAdmin
      .from('venues')
      .update(updates)
      .eq('id', venue_id)
      .select()
      .single();

    if (error) {
      throw new Error(`更新场地失败: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      venue
    });

  } catch (error) {
    console.error('更新场地失败:', error);

    if ((error as Error).name === 'AuthError') {
      return handleAuthError(res, error as Error);
    }

    return res.status(500).json({
      success: false,
      message: (error as Error).message || '更新场地失败'
    });
  }
}
