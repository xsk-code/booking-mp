// pages/index/index.js
const app = getApp();
const { get } = require('../../utils/request.js');

const RECENT_VENUES_KEY = 'recentVenues';
const MAX_RECENT_VENUES = 5;

Page({
  data: {
    venueCode: '',
    recentVenues: [],
    hasRecentVenues: false,
    searchLoading: false
  },

  onLoad() {
    this.loadRecentVenues();
  },

  onShow() {
    this.loadRecentVenues();
  },

  loadRecentVenues() {
    try {
      const recentVenues = wx.getStorageSync(RECENT_VENUES_KEY) || [];
      this.setData({
        recentVenues,
        hasRecentVenues: recentVenues.length > 0
      });
    } catch (error) {
      console.error('加载最近访问场地失败:', error);
    }
  },

  onVenueCodeInput(e) {
    this.setData({
      venueCode: e.detail.value.toUpperCase()
    });
  },

  async onSearch() {
    const { venueCode } = this.data;
    
    if (!venueCode || venueCode.trim() === '') {
      wx.showToast({
        title: '请输入场地码',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ searchLoading: true });

      const res = await get('/venues/search', { code: venueCode.trim() });
      
      if (res.success && res.venue) {
        this.addToRecentVenues(res.venue);
        this.goToVenueDetail(res.venue.id);
      }
    } catch (error) {
      console.error('搜索场地失败:', error);
      wx.showToast({
        title: error.message || '场地不存在',
        icon: 'none'
      });
    } finally {
      this.setData({ searchLoading: false });
    }
  },

  onScanCode() {
    wx.scanCode({
      success: (res) => {
        this.handleScanResult(res);
      },
      fail: (error) => {
        console.error('扫码失败:', error);
        if (error.errMsg && !error.errMsg.includes('cancel')) {
          wx.showToast({
            title: '扫码失败',
            icon: 'none'
          });
        }
      }
    });
  },

  handleScanResult(scanRes) {
    let venueCode = '';
    const result = scanRes.result || '';
    
    if (result.includes('booking://venue?code=')) {
      const match = result.match(/code=([A-Z0-9]+)/i);
      if (match && match[1]) {
        venueCode = match[1].toUpperCase();
      }
    } else {
      venueCode = result.toUpperCase().trim();
    }

    if (!venueCode) {
      wx.showToast({
        title: '无效的场地二维码',
        icon: 'none'
      });
      return;
    }

    this.setData({ venueCode });
    this.searchVenueByCode(venueCode);
  },

  async searchVenueByCode(code) {
    try {
      this.setData({ searchLoading: true });

      const res = await get('/venues/search', { code });
      
      if (res.success && res.venue) {
        this.addToRecentVenues(res.venue);
        this.goToVenueDetail(res.venue.id);
      }
    } catch (error) {
      console.error('搜索场地失败:', error);
      wx.showToast({
        title: error.message || '场地不存在',
        icon: 'none'
      });
    } finally {
      this.setData({ searchLoading: false });
    }
  },

  addToRecentVenues(venue) {
    try {
      let recentVenues = wx.getStorageSync(RECENT_VENUES_KEY) || [];
      
      recentVenues = recentVenues.filter(v => v.id !== venue.id);
      
      recentVenues.unshift({
        id: venue.id,
        name: venue.name,
        venue_code: venue.venue_code,
        address: venue.address,
        visited_at: new Date().toISOString()
      });
      
      if (recentVenues.length > MAX_RECENT_VENUES) {
        recentVenues = recentVenues.slice(0, MAX_RECENT_VENUES);
      }
      
      wx.setStorageSync(RECENT_VENUES_KEY, recentVenues);
      
      this.setData({
        recentVenues,
        hasRecentVenues: recentVenues.length > 0
      });
    } catch (error) {
      console.error('保存最近访问场地失败:', error);
    }
  },

  goToVenueDetail(venueId) {
    wx.navigateTo({
      url: `/pages/venue-detail/venue-detail?id=${venueId}`
    });
  },

  onRecentVenueTap(e) {
    const venueId = e.currentTarget.dataset.id;
    this.goToVenueDetail(venueId);
  },

  clearRecentVenues() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除最近访问记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync(RECENT_VENUES_KEY);
            this.setData({
              recentVenues: [],
              hasRecentVenues: false
            });
            wx.showToast({
              title: '已清除',
              icon: 'success'
            });
          } catch (error) {
            console.error('清除最近访问记录失败:', error);
          }
        }
      }
    });
  }
});
