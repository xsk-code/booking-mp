// pages/my-venues/pending-bookings/pending-bookings.js
const app = getApp();
const { get, post } = require('../../../utils/request.js');
const { formatBookingStatus } = require('../../../utils/util.js');

Page({
  data: {
    venueId: '',
    bookings: [],
    loading: true
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
    this.loadPendingBookings();
  },

  onPullDownRefresh() {
    this.loadPendingBookings().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadPendingBookings() {
    const { venueId } = this.data;
    
    if (!venueId) {
      this.setData({ loading: false, bookings: [] });
      return;
    }

    try {
      this.setData({ loading: true });

      const res = await get('/bookings/pending-list', { venue_id: venueId });
      
      const bookings = (res.bookings || []).map(item => {
        const statusInfo = formatBookingStatus(item.status);
        return {
          ...item,
          statusText: statusInfo.text
        };
      });

      this.setData({
        bookings,
        loading: false
      });
    } catch (error) {
      console.error('加载待审核预约失败:', error);
      this.setData({
        bookings: [],
        loading: false
      });
    }
  },

  async onApprove(e) {
    const bookingId = e.currentTarget.dataset.id;
    
    try {
      const res = await post('/bookings/approve', { booking_id: bookingId });
      
      if (res.success) {
        wx.showToast({
          title: '审核通过',
          icon: 'success'
        });
        this.loadPendingBookings();
      }
    } catch (error) {
      console.error('审核通过失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  onReject(e) {
    const bookingId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '拒绝预约',
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await post('/bookings/reject', {
              booking_id: bookingId,
              reject_reason: res.content || ''
            });
            
            if (result.success) {
              wx.showToast({
                title: '已拒绝',
                icon: 'success'
              });
              this.loadPendingBookings();
            }
          } catch (error) {
            console.error('拒绝预约失败:', error);
            wx.showToast({
              title: error.message || '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  goToBookingDetail(e) {
    const bookingId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking-detail/booking-detail?id=${bookingId}`
    });
  }
});
