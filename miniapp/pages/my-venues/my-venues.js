// pages/my-venues/my-venues.js
const app = getApp();
const { get } = require('../../utils/request.js');

Page({
  data: {
    venues: [],
    loading: true,
    hasVenues: false
  },

  onLoad() {
    
  },

  onShow() {
    this.loadMyVenues();
  },

  onPullDownRefresh() {
    this.loadMyVenues().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadMyVenues() {
    try {
      this.setData({ loading: true });

      const res = await get('/venues/my-venues');
      
      const venues = res.venues || [];
      
      this.setData({
        venues,
        hasVenues: venues.length > 0,
        loading: false
      });
    } catch (error) {
      console.error('加载我的场地失败:', error);
      this.setData({
        venues: [],
        hasVenues: false,
        loading: false
      });
    }
  },

  goToCreateVenue() {
    wx.navigateTo({
      url: '/pages/my-venues/venue-edit/venue-edit'
    });
  },

  goToVenueManage(e) {
    const venueId = e.currentTarget.dataset.id;
    const venueName = e.currentTarget.dataset.name;
    
    wx.setStorageSync('currentVenue', {
      id: venueId,
      name: venueName
    });

    wx.navigateTo({
      url: `/pages/my-venues/venue-dashboard/venue-dashboard?id=${venueId}`
    });
  }
});
