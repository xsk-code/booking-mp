// api/_utils/auth.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verify } from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthUser {
  userId: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export function authenticate(req: VercelRequest): AuthUser {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new AuthError('未登录');
  }

  try {
    const payload = verify(token, JWT_SECRET) as any;
    return {
      userId: payload.sub
    };
  } catch (error) {
    throw new AuthError('token 无效或已过期');
  }
}

export async function requireVenueOwner(req: VercelRequest, venueId: string): Promise<AuthUser> {
  const user = authenticate(req);
  
  const { data: venue, error } = await supabaseAdmin
    .from('venues')
    .select('creator_id')
    .eq('id', venueId)
    .single();

  if (error || !venue) {
    throw new AuthError('场地不存在');
  }

  if (venue.creator_id !== user.userId) {
    throw new AuthError('无权限：仅场地所有者可操作');
  }
  
  return user;
}

export async function requireResourceOwner(req: VercelRequest, resourceId: string): Promise<AuthUser> {
  const user = authenticate(req);
  
  const { data: resource, error } = await supabaseAdmin
    .from('resources')
    .select('venue_id, venues!inner(creator_id)')
    .eq('id', resourceId)
    .single();

  if (error || !resource) {
    throw new AuthError('资源不存在');
  }

  const venues = resource.venues as any;
  if (!venues || venues.creator_id !== user.userId) {
    throw new AuthError('无权限：仅场地所有者可操作');
  }
  
  return user;
}

export async function requireBookingOwner(req: VercelRequest, bookingId: string): Promise<AuthUser> {
  const user = authenticate(req);
  
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('venue_id, venues!inner(creator_id)')
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    throw new AuthError('预约不存在');
  }

  const venues = booking.venues as any;
  if (!venues || venues.creator_id !== user.userId) {
    throw new AuthError('无权限：仅场地所有者可操作');
  }
  
  return user;
}

export function handleAuthError(res: VercelResponse, error: Error) {
  if (error instanceof AuthError) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
  return res.status(500).json({
    success: false,
    message: '服务器错误'
  });
}
