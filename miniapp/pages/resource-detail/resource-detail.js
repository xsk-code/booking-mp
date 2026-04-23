// pages/resource-detail/resource-detail.js
const app = getApp();
const { get } = require('../../utils/request.js');

Page({
  data: {
    resourceId: '',
    resource: null,
    loading: true
  },

  onLoad(options) {
    this.setData({ resourceId: options.id });
    this.loadResourceDetail(options.id);
  },

  // 加载资源详情
  async loadResourceDetail(resourceId) {
    try {
      const res = await get('/resources/detail', { id: resourceId });
      this.setData({
        resource: res.resource,
        loading: false
      });
    } catch (error) {
      console.error('加载资源详情失败:', error);
      // 显示模拟数据
      this.setData({
        resource: {
          id: resourceId,
          name: 'A01 豪华包间',
          type: 'room',
          capacity: 8,
          price: 88.00,
          description: '豪华包间，配备专业麻将桌、空调、茶水服务。环境安静舒适，适合朋友聚会、商务洽谈。',
          cover_image_url: ''
        },
        loading: false
      });
    }
  },

  // 跳转到预约页面
  goToBooking() {
    wx.navigateTo({
      url: `/pages/booking/booking?resource_id=${this.data.resourceId}`
    });
  }
});
