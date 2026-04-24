// pages/my-venues/time-slot-manage/time-slot-manage.js
const app = getApp();
const { get, post } = require('../../../utils/request.js');

Page({
  data: {
    resourceId: '',
    resourceName: '',
    timeSlots: [],
    weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  },

  onLoad(options) {
    if (options.resource_id) {
      this.setData({ resourceId: options.resource_id });
    }
  },

  onShow() {
    if (!this.data.resourceId) {
      const currentResource = wx.getStorageSync('currentResource');
      if (currentResource && currentResource.id) {
        this.setData({
          resourceId: currentResource.id,
          resourceName: currentResource.name
        });
      }
    }
    this.loadTimeSlots();
  },

  async loadTimeSlots() {
    const { resourceId } = this.data;
    
    if (!resourceId) return;

    try {
      const res = await get('/time-slots/list', { resource_id: resourceId });
      
      this.setData({
        timeSlots: res.time_slots || []
      });
    } catch (error) {
      console.error('加载时段列表失败:', error);
    }
  },

  async generateFromBusinessHours() {
    wx.showModal({
      title: '确认生成',
      content: '将根据场地营业时间自动生成时段，是否继续？',
      success: async (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '生成中...',
            icon: 'loading'
          });
        }
      }
    });
  },

  async onSave() {
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  }
});
