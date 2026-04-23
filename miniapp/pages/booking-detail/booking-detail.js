// pages/booking-detail/booking-detail.js
const app = getApp();
const { get, post } = require('../../utils/request.js');
const { formatBookingStatus, showConfirm, showToast } = require('../../utils/util.js');

Page({
  data: {
    bookingId: '',
    booking: null,
    loading: true
  },

  onLoad(options) {
    this.setData({ bookingId: options.id });
    this.loadBookingDetail(options.id);
  },

  onShow() {
    // 页面显示时刷新详情
    if (this.data.bookingId) {
      this.loadBookingDetail(this.data.bookingId);
    }
  },

  // 加载预约详情
  async loadBookingDetail(bookingId) {
    try {
      this.setData({ loading: true });
      
      const res = await get('/bookings/detail', { id: bookingId });
      
      // 格式化状态显示
      const statusInfo = formatBookingStatus(res.booking.status);
      const booking = {
        ...res.booking,
        statusText: statusInfo.text
      };
      
      this.setData({
        booking,
        loading: false
      });
    } catch (error) {
      console.error('加载预约详情失败:', error);
      // 显示模拟数据
      this.setData({
        booking: {
          id: bookingId,
          resource_name: 'A01 豪华包间',
          status: 'pending',
          statusText: '待审核',
          booking_date: '2025-07-02',
          start_time: '14:00',
          end_time: '16:00',
          guest_count: 6,
          contact_name: '张三',
          contact_phone: '13800138000',
          remark: '希望能提供茶水服务',
          venue_contact_phone: '010-12345678'
        },
        loading: false
      });
    }
  },

  // 取消预约
  async cancelBooking() {
    const booking = this.data.booking;
    let message = '确定要取消预约吗？';
    
    if (booking.status === 'approved') {
      message = '该预约已通过审核，确定要取消吗？';
    }
    
    const confirmed = await showConfirm('取消预约', message);
    if (!confirmed) return;
    
    try {
      wx.showLoading({ title: '取消中...', mask: true });
      
      await post('/bookings/cancel', { booking_id: booking.id });
      
      wx.hideLoading();
      showToast('预约已取消');
      
      // 返回上一页
      wx.navigateBack();
    } catch (error) {
      wx.hideLoading();
      console.error('取消预约失败:', error);
      showToast('取消失败，请稍后重试');
    }
  },

  // 联系场地
  contactAdmin() {
    const booking = this.data.booking;
    if (booking.venue_contact_phone) {
      wx.makePhoneCall({
        phoneNumber: booking.venue_contact_phone
      });
    } else {
      showToast('暂无联系电话');
    }
  }
});
