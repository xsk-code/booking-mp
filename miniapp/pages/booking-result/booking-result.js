// pages/booking-result/booking-result.js
Page({
  data: {
    isSuccess: true,
    bookingId: '',
    errorMessage: '预约提交失败，请稍后重试'
  },

  onLoad(options) {
    const isSuccess = options.success === '1';
    const bookingId = options.booking_id || '';
    
    this.setData({
      isSuccess,
      bookingId
    });
  },

  // 跳转到我的预约
  goToMyBookings() {
    wx.switchTab({
      url: '/pages/my-bookings/my-bookings'
    });
  },

  // 返回首页
  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
