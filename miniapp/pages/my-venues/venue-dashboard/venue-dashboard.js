// pages/my-venues/venue-dashboard/venue-dashboard.js
const app = getApp();
const { get } = require('../../../utils/request.js');

Page({
  data: {
    venueId: '',
    venueName: '',
    stats: {
      pending_count: 0,
      today_count: 0,
      approved_count: 0,
      total_count: 0,
      approval_rate: 0
    },
    recentBookings: []
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ venueId: options.id });
    }
  },

  onShow() {
    this.loadDashboardData();
  },

  async loadDashboardData() {
    const { venueId } = this.data;
    
    if (!venueId) {
      const currentVenue = wx.getStorageSync('currentVenue');
      if (currentVenue && currentVenue.id) {
        this.setData({
          venueId: currentVenue.id,
          venueName: currentVenue.name
        });
      } else {
        wx.showToast({
          title: '请先选择场地',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
    }

    try {
      const statsRes = await get('/stats/overview', { venue_id: this.data.venueId });
      
      if (statsRes.success && statsRes.stats) {
        this.setData({
          stats: statsRes.stats
        });
      }

      const bookingsRes = await get('/bookings/pending-list', { 
        venue_id: this.data.venueId,
        limit: 5 
      });

      if (bookingsRes.success && bookingsRes.bookings) {
        this.setData({
          recentBookings: bookingsRes.bookings
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  },

  goToPendingBookings() {
    wx.navigateTo({
      url: `/pages/my-venues/pending-bookings/pending-bookings?venue_id=${this.data.venueId}`
    });
  },

  goToBookingCalendar() {
    wx.navigateTo({
      url: `/pages/my-venues/booking-calendar/booking-calendar?venue_id=${this.data.venueId}`
    });
  },

  goToResourceManage() {
    wx.navigateTo({
      url: `/pages/my-venues/resource-manage/resource-manage?venue_id=${this.data.venueId}`
    });
  },

  goToVenueSettings() {
    wx.navigateTo({
      url: `/pages/my-venues/venue-edit/venue-edit?id=${this.data.venueId}`
    });
  },

  goToStats() {
    wx.navigateTo({
      url: `/pages/my-venues/stats/stats?venue_id=${this.data.venueId}`
    });
  },

  goToBookingDetail(e) {
    const bookingId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${bookingId}`
    });
  }
});
