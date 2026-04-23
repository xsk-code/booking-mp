// pages/index/index.js
const app = getApp();
const { get } = require('../../utils/request.js');

Page({
  data: {
    searchKeyword: '',
    venueList: [],
    loading: true
  },

  onLoad() {
    this.loadVenueList();
  },

  onShow() {
    // 页面显示时刷新列表
    this.loadVenueList();
  },

  onPullDownRefresh() {
    this.loadVenueList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载场地列表
  async loadVenueList() {
    try {
      this.setData({ loading: true });
      
      // 调用 API 获取场地列表
      const res = await get('/venues/list');
      
      this.setData({
        venueList: res.venues || [],
        loading: false
      });
    } catch (error) {
      console.error('加载场地列表失败:', error);
      // 显示模拟数据（开发阶段）
      this.setData({
        venueList: [
          {
            id: '1',
            name: '阳光棋牌室',
            address: '北京市朝阳区建国路88号',
            business_start: '09:00',
            business_end: '22:00',
            contact_phone: '010-12345678',
            cover_image_url: ''
          },
          {
            id: '2',
            name: '清风茶室',
            address: '北京市海淀区中关村大街1号',
            business_start: '10:00',
            business_end: '23:00',
            contact_phone: '010-87654321',
            cover_image_url: ''
          }
        ],
        loading: false
      });
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    // 可以在这里实现搜索过滤
  },

  // 跳转到场地详情
  goToVenueDetail(e) {
    const venueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/venue-detail/venue-detail?id=${venueId}`
    });
  }
});
