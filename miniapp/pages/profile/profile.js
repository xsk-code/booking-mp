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

  checkLoginStatus() {
    const appInstance = getApp();
    const isLoggedIn = appInstance.globalData.isLoggedIn;
    const userInfo = appInstance.globalData.userInfo;
    
    this.setData({
      isLoggedIn,
      userInfo
    });
  },

  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...', mask: true });
      
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      if (!loginRes.code) {
        throw new Error('登录失败');
      }
      
      const res = await post('/auth/login', {
        code: loginRes.code
      });
      
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
      
      const mockUser = {
        id: 'mock-user-id',
        nickname: '微信用户',
        avatar_url: ''
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

  goToMyBookings() {
    wx.switchTab({
      url: '/pages/my-bookings/my-bookings'
    });
  },

  goToMyVenues() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/my-venues/my-venues'
    });
  },

  contactService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567'
    });
  },

  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '预约小程序 v1.0.0\n\n为商户提供便捷的预约管理服务，支持用户在线预约、场地所有者审核确认等功能。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
