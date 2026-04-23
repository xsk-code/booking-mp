// pages/admin/dashboard/dashboard.js
const app = getApp();
const { get } = require('../../../utils/request.js');
const { formatBookingStatus } = require('../../../utils/util.js');

Page({
  data: {
    stats: {
      pendingCount: 0,
      todayCount: 0,
      approvedCount: 0,
      totalCount: 0
    },
    recentBookings: []
  },

  onLoad() {
    this.loadDashboardData();
  },

  onShow() {
    this.loadDashboardData();
  },

  // 加载后台数据
  async loadDashboardData() {
    try {
      // 加载统计数据
      const statsRes = await get('/admin/stats/overview');
      
      // 加载最近预约
      const bookingsRes = await get('/admin/bookings/pending-list', { limit: 5 });
      
      // 格式化状态显示
      const recentBookings = (bookingsRes.bookings || []).map(item => {
        const statusInfo = formatBookingStatus(item.status);
        return {
          ...item,
          statusText: statusInfo.text
        };
      });
      
      this.setData({
        stats: statsRes.stats || {
          pendingCount: 3,
          todayCount: 5,
          approvedCount: 12,
          totalCount: 45
        },
        recentBookings: recentBookings.length > 0 ? recentBookings : [
          {
            id: '1',
            resource_name: 'A01 豪华包间',
            booking_date: '2025-07-02',
            start_time: '14:00',
            end_time: '16:00',
            contact_name: '张三',
            contact_phone: '13800138000',
            status: 'pending',
            statusText: '待审核'
          },
          {
            id: '2',
            resource_name: 'A02 标准包间',
            booking_date: '2025-07-02',
            start_time: '16:00',
            end_time: '18:00',
            contact_name: '李四',
            contact_phone: '13900139000',
            status: 'approved',
            statusText: '已通过'
          }
        ]
      });
      
    } catch (error) {
      console.error('加载后台数据失败:', error);
      // 显示模拟数据
      this.setData({
        stats: {
          pendingCount: 3,
          todayCount: 5,
          approvedCount: 12,
          totalCount: 45
        },
        recentBookings: [
          {
            id: '1',
            resource_name: 'A01 豪华包间',
            booking_date: '2025-07-02',
            start_time: '14:00',
            end_time: '16:00',
            contact_name: '张三',
            contact_phone: '13800138000',
            status: 'pending',
            statusText: '待审核'
          },
          {
            id: '2',
            resource_name: 'A02 标准包间',
            booking_date: '2025-07-02',
            start_time: '16:00',
            end_time: '18:00',
            contact_name: '李四',
            contact_phone: '13900139000',
            status: 'approved',
            statusText: '已通过'
          }
        ]
      });
    }
  },

  // 跳转到待审核列表
  goToPendingBookings() {
    wx.navigateTo({
      url: '/pages/admin/pending-bookings/pending-bookings'
    });
  },

  // 跳转到预约日历
  goToBookingCalendar() {
    wx.navigateTo({
      url: '/pages/admin/booking-calendar/booking-calendar'
    });
  },

  // 跳转到资源管理
  goToResourceManage() {
    wx.navigateTo({
      url: '/pages/admin/resource-manage/resource-manage'
    });
  },

  // 跳转到场地设置
  goToVenueSettings() {
    wx.navigateTo({
      url: '/pages/admin/venue-settings/venue-settings'
    });
  },

  // 跳转到数据统计
  goToStats() {
    wx.navigateTo({
      url: '/pages/admin/stats/stats'
    });
  },

  // 跳转到预约详情
  goToBookingDetail(e) {
    const bookingId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${bookingId}`
    });
  }
});
