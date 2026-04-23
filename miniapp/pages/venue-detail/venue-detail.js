// pages/venue-detail/venue-detail.js
const app = getApp();
const { get } = require('../../utils/request.js');

Page({
  data: {
    venueId: '',
    venue: null,
    resourceList: [],
    loading: true
  },

  onLoad(options) {
    this.setData({ venueId: options.id });
    this.loadVenueDetail(options.id);
    this.loadResourceList(options.id);
  },

  onShow() {
    // 页面显示时刷新资源列表
    if (this.data.venueId) {
      this.loadResourceList(this.data.venueId);
    }
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadVenueDetail(this.data.venueId),
      this.loadResourceList(this.data.venueId)
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载场地详情
  async loadVenueDetail(venueId) {
    try {
      const res = await get('/venues/detail', { id: venueId });
      this.setData({ venue: res.venue });
    } catch (error) {
      console.error('加载场地详情失败:', error);
      // 显示模拟数据
      this.setData({
        venue: {
          id: venueId,
          name: '阳光棋牌室',
          address: '北京市朝阳区建国路88号',
          business_start: '09:00',
          business_end: '22:00',
          contact_phone: '010-12345678',
          description: '专业棋牌室，环境优雅，提供茶水服务。'
        }
      });
    }
  },

  // 加载资源列表
  async loadResourceList(venueId) {
    try {
      this.setData({ loading: true });
      const res = await get('/resources/list', { venue_id: venueId });
      this.setData({
        resourceList: res.resources || [],
        loading: false
      });
    } catch (error) {
      console.error('加载资源列表失败:', error);
      // 显示模拟数据
      this.setData({
        resourceList: [
          {
            id: '101',
            name: 'A01 豪华包间',
            type: 'room',
            capacity: 8,
            price: 88.00,
            cover_image_url: ''
          },
          {
            id: '102',
            name: 'A02 标准包间',
            type: 'room',
            capacity: 6,
            price: 58.00,
            cover_image_url: ''
          },
          {
            id: '103',
            name: 'B01 大厅桌位',
            type: 'table',
            capacity: 4,
            price: 28.00,
            cover_image_url: ''
          }
        ],
        loading: false
      });
    }
  },

  // 跳转到资源详情
  goToResourceDetail(e) {
    const resourceId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/resource-detail/resource-detail?id=${resourceId}`
    });
  },

  // 拨打电话
  callPhone() {
    const phone = this.data.venue.contact_phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      });
    }
  }
});
