// api/bookings/available-slots.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAnon } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '不支持的请求方法'
    });
  }

  try {
    const { resource_id, date } = req.query;

    if (!resource_id || !date) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 1. 获取资源的时段规则
    const bookingDate = new Date(date as string);
    const weekday = bookingDate.getDay(); // 0=周日, 1=周一, ..., 6=周六

    const { data: timeSlots, error: slotsError } = await supabaseAnon
      .from('resource_time_slots')
      .select('*')
      .eq('resource_id', resource_id)
      .eq('weekday', weekday);

    if (slotsError) {
      throw new Error(slotsError.message);
    }

    // 2. 获取该日期已预约的时段
    const { data: bookedSlots, error: bookedError } = await supabaseAnon
      .from('bookings')
      .select('start_time, end_time, status')
      .eq('resource_id', resource_id)
      .eq('booking_date', date)
      .in('status', ['pending', 'approved']);

    if (bookedError) {
      throw new Error(bookedError.message);
    }

    // 3. 计算可用时段
    const slots = (timeSlots || []).map(slot => {
      const isBooked = bookedSlots?.some(booked => {
        return isTimeOverlap(
          slot.start_time,
          slot.end_time,
          booked.start_time,
          booked.end_time
        );
      });

      return {
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: !isBooked && slot.is_available
      };
    });

    return res.status(200).json({
      success: true,
      slots
    });

  } catch (error) {
    console.error('获取可用时段失败:', error);
    return res.status(500).json({
      success: false,
      message: (error as Error).message || '获取可用时段失败'
    });
  }
}

// 检查两个时间段是否重叠
function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  
  return !(e1 <= s2 || e2 <= s1);
}

// 解析时间字符串为分钟数
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}
