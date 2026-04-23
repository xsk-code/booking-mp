// pages/admin/pending-bookings/pending-bookings.js
const app = getApp();
const { get, post } = require('../../../utils/request.js');
const { showConfirm, showToast } = require('../../../utils/util.js');

Page({
  data: {
    bookingList: [],
    loading: true
  },

  onLoad() {
    this.loadPendingBookings();
  },

  onShow() {
    this.loadPendingBookings();
  },

  onPullDownRefresh() {
    this.loadPendingBookings().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载待审核列表
  async loadPendingBookings() {
    try {
      this.setData({ loading: true });
      
      const res = await get('/admin/bookings/pending-list');
      
      this.setData({
        bookingList: res.bookings || [],
        loading: false
      });
    } catch (error) {
      console.error('加载待审核列表失败:', error);
      // 显示模拟数据
      this.setData({
        bookingList: [
          {
            id: '1',
            resource_name: 'A01 豪华包间',
            booking_date: '2025-07-02',
            start_time: '14:00',
            end_time: '16:00',
            contact_name: '张三',
            contact_phone: '13800138000',
            guest_count: 6,
            remark: '希望能提供茶水服务'
          },
          {
            id: '2',
            resource_name: 'A02 标准包间',
            booking_date: '2025-07-02',
            start_time: '16:00',
            end_time: '18:00',
            contact_name: '李四',
            contact_phone: '13900139000',
            guest_count: 4
          }
        ],
        loading: false
      });
    }
  },

  // 审核通过
  async approveBooking(e) {
    const bookingId = e.currentTarget.dataset.id;
    
    const confirmed = await showConfirm('确认通过', '确定要通过该预约吗？');
    if (!confirmed) return;
    
    try {
      wx.showLoading({ title: '处理中...', mask: true });
      
      await post('/admin/bookings/approve', { booking_id: bookingId });
      
      wx.hideLoading();
      showToast('审核通过');
      
      // 刷新列表
      this.loadPendingBookings();
    } catch (error) {
      wx.hideLoading();
      console.error('审核失败:', error);
      showToast('操作失败，请重试');
    }
  },

  // 审核拒绝
  async rejectBooking(e) {
    const bookingId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '拒绝预约',
      editable: true,
      placeholderText: '请输入拒绝原因（可选）',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...', mask: true });
            
            await post('/admin/bookings/reject', {
              booking_id: bookingId,
              reject_reason: res.content || ''
            });
            
            wx.hideLoading();
            showToast('已拒绝');
            
            // 刷新列表
            this.loadPendingBookings();
          } catch (error) {
            wx.hideLoading();
            console.error('拒绝失败:', error);
            showToast('操作失败，请重试');
          }
        }
      }
    });
  }
});
