// pages/my-bookings/my-bookings.js
const app = getApp();
const { get, post } = require('../../utils/request.js');
const { formatBookingStatus, showConfirm, showToast } = require('../../utils/util.js');

Page({
  data: {
    tabs: [
      { label: '全部', value: '' },
      { label: '待审核', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' },
      { label: '已取消', value: 'cancelled' }
    ],
    currentTab: 0,
    currentStatus: '',
    bookingList: [],
    loading: true
  },

  onLoad() {
    this.loadBookingList();
  },

  onShow() {
    // 页面显示时刷新列表
    this.loadBookingList();
  },

  onPullDownRefresh() {
    this.loadBookingList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载预约列表
  async loadBookingList() {
    try {
      this.setData({ loading: true });
      
      const params = {};
      if (this.data.currentStatus) {
        params.status = this.data.currentStatus;
      }
      
      const res = await get('/bookings/list', params);
      
      // 格式化状态显示
      const bookingList = (res.bookings || []).map(item => {
        const statusInfo = formatBookingStatus(item.status);
        return {
          ...item,
          statusText: statusInfo.text
        };
      });
      
      this.setData({
        bookingList,
        loading: false
      });
    } catch (error) {
      console.error('加载预约列表失败:', error);
      // 显示模拟数据
      this.setData({
        bookingList: [
          {
            id: '1',
            resource_name: 'A01 豪华包间',
            status: 'pending',
            statusText: '待审核',
            booking_date: '2025-07-02',
            start_time: '14:00',
            end_time: '16:00',
            contact_name: '张三',
            contact_phone: '13800138000'
          },
          {
            id: '2',
            resource_name: 'A02 标准包间',
            status: 'approved',
            statusText: '已通过',
            booking_date: '2025-07-03',
            start_time: '10:00',
            end_time: '12:00',
            contact_name: '李四',
            contact_phone: '13900139000'
          },
          {
            id: '3',
            resource_name: 'B01 大厅桌位',
            status: 'rejected',
            statusText: '已拒绝',
            booking_date: '2025-06-30',
            start_time: '18:00',
            end_time: '20:00',
            contact_name: '王五',
            contact_phone: '13700137000'
          }
        ],
        loading: false
      });
    }
  },

  // 切换标签
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.currentTarget.dataset.value;
    
    this.setData({
      currentTab: index,
      currentStatus: value
    });
    
    this.loadBookingList();
  },

  // 跳转到预约详情
  goToBookingDetail(e) {
    const bookingId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${bookingId}`
    });
  },

  // 取消预约
  async cancelBooking(e) {
    const bookingId = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    
    let message = '确定要取消预约吗？';
    if (status === 'approved') {
      message = '该预约已通过审核，确定要取消吗？';
    }
    
    const confirmed = await showConfirm('取消预约', message);
    if (!confirmed) return;
    
    try {
      wx.showLoading({ title: '取消中...', mask: true });
      
      await post('/bookings/cancel', { booking_id: bookingId });
      
      wx.hideLoading();
      showToast('预约已取消');
      
      // 刷新列表
      this.loadBookingList();
    } catch (error) {
      wx.hideLoading();
      console.error('取消预约失败:', error);
      showToast('取消失败，请稍后重试');
    }
  },

  // 去首页
  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});
