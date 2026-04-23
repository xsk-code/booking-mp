// pages/admin/stats/stats.js
Page({
  data: {
    stats: {
      totalBookings: 45,
      pendingCount: 3,
      approvedRate: 85,
      topResources: [
        { name: 'A01 豪华包间', count: 15 },
        { name: 'A02 标准包间', count: 12 },
        { name: 'B01 大厅桌位', count: 8 }
      ]
    }
  },

  onLoad() {
    
  }
});
