// api/_utils/wechat.ts
import axios from 'axios';

const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_SECRET = process.env.WECHAT_SECRET || '';

export interface WechatSession {
  openid: string;
  session_key: string;
  unionid?: string;
}

// 微信 code2Session 接口
export async function code2Session(code: string): Promise<WechatSession> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`;
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.errcode) {
      throw new Error(`微信登录失败: ${data.errmsg}`);
    }
    
    return {
      openid: data.openid,
      session_key: data.session_key,
      unionid: data.unionid
    };
  } catch (error) {
    throw new Error(`调用微信 API 失败: ${(error as Error).message}`);
  }
}

// 发送订阅消息
export async function sendSubscribeMessage(
  openid: string,
  templateId: string,
  data: Record<string, { value: string }>,
  page?: string
): Promise<void> {
  // 先获取 access_token
  const accessToken = await getAccessToken();
  
  const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;
  
  const body = {
    touser: openid,
    template_id: templateId,
    page: page || '',
    data: data,
    miniprogram_state: 'formal' // formal: 正式版，trial: 体验版，developer: 开发版
  };
  
  try {
    const response = await axios.post(url, body);
    const result = response.data;
    
    if (result.errcode && result.errcode !== 0) {
      console.error(`发送订阅消息失败: ${result.errmsg}`);
    }
  } catch (error) {
    console.error(`调用微信订阅消息 API 失败: ${(error as Error).message}`);
  }
}

// 获取 access_token
let accessTokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

export async function getAccessToken(): Promise<string> {
  // 检查缓存是否有效
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }
  
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`;
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.errcode) {
      throw new Error(`获取 access_token 失败: ${data.errmsg}`);
    }
    
    accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 300) * 1000 // 提前5分钟过期
    };
    
    return data.access_token;
  } catch (error) {
    throw new Error(`获取 access_token 失败: ${(error as Error).message}`);
  }
}
