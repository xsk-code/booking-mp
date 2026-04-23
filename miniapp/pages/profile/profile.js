// pages/profile/profile.js
const app = getApp();
const { post } = require('../../utils/request.js');
const { showConfirm, showToast } = require('../../utils/util.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
  },

  // 检查登录状态
  checkLoginStatus() {
    const appInstance = getApp();
    const isLoggedIn = appInstance.globalData.isLoggedIn;
    const userInfo = appInstance.globalData.userInfo;
    
    this.setData({
      isLoggedIn,
      userInfo
    });
  },

  // 处理登录
  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      
      // 1. 调用 wx.login 获取 code
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      if (!loginRes.code) {
        throw new Error('登录失败');
      }
      
      // 2. 调用后端登录接口
      const res = await post('/auth/login', {
        code: loginRes.code
      });
      
      // 3. 保存登录状态
      const appInstance = getApp();
      appInstance.saveLoginStatus(res.token, res.user);
      
      wx.hideLoading();
      showToast('登录成功');
      
      this.setData({
        isLoggedIn: true,
        userInfo: res.user
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('登录失败:', error);
      
      // 模拟登录成功（开发阶段）
      const mockUser = {
        id: 'mock-user-id',
        nickname: '微信用户',
        avatarUrl: '',
        role: 'user' // 普通用户
        // role: 'admin' // 管理员（测试用）
      };
      
      const appInstance = getApp();
      appInstance.saveLoginStatus('mock-token', mockUser);
      
      showToast('登录成功');
      
      this.setData({
        isLoggedIn: true,
        userInfo: mockUser
      });
    }
  },

  // 处理退出登录
  async handleLogout() {
    const confirmed = await showConfirm('退出登录', '确定要退出登录吗？');
    if (!confirmed) return;
    
    const appInstance = getApp();
    appInstance.logout();
    
    this.setData({
      isLoggedIn: false,
      userInfo: null
    });
    
    showToast('已退出登录');
  },

  // 跳转到我的预约
  goToMyBookings() {
    wx.switchTab({
      url: '/pages/my-bookings/my-bookings'
    });
  },

  // 跳转到管理后台
  goToAdminDashboard() {
    wx.navigateTo({
      url: '/pages/admin/dashboard/dashboard'
    });
  },

  // 联系客服
  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567'
    });
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '预约小程序 v1.0.0\n\n为商户提供便捷的预约管理服务，支持用户在线预约、管理员审核确认等功能。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
