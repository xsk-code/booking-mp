// pages/my-venues/booking-calendar/booking-calendar.js
const app = getApp();

Page({
  data: {
    venueId: '',
    currentDate: '',
    bookings: []
  },

  onLoad(options) {
    if (options.venue_id) {
      this.setData({ venueId: options.venue_id });
    }
    
    const today = new Date().toISOString().split('T')[0];
    this.setData({ currentDate: today });
  },

  onDateChange(e) {
    this.setData({ currentDate: e.detail.value });
  }
});
