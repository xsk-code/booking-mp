// pages/my-venues/stats/stats.js
const app = getApp();
const { get } = require('../../../utils/request.js');

Page({
  data: {
    venueId: '',
    stats: {
      pending_count: 0,
      today_count: 0,
      approved_count: 0,
      total_count: 0,
      approval_rate: 0
    }
  },

  onLoad(options) {
    if (options.venue_id) {
      this.setData({ venueId: options.venue_id });
    }
  },

  onShow() {
    if (!this.data.venueId) {
      const currentVenue = wx.getStorageSync('currentVenue');
      if (currentVenue && currentVenue.id) {
        this.setData({ venueId: currentVenue.id });
      }
    }
    this.loadStats();
  },

  async loadStats() {
    const { venueId } = this.data;
    
    if (!venueId) return;

    try {
      const res = await get('/stats/overview', { venue_id: venueId });
      
      if (res.success && res.stats) {
        this.setData({
          stats: res.stats
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }
});
