// config.js
module.exports = {
  // API 基础地址
  apiBaseUrl: 'https://your-vercel-app.vercel.app/api',
  
  // Supabase 配置
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
  
  // 微信小程序配置
  wechatAppId: 'wx0000000000000000',
  
  // 其他配置
  bookingExpireHours: 24, // 审核超时时间（小时）
  maxBookingDays: 14, // 最大可预约天数
};
