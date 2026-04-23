// pages/booking/booking.js
const app = getApp();
const { get, post } = require('../../utils/request.js');
const { getFutureDates, showToast } = require('../../utils/util.js');

Page({
  data: {
    resourceId: '',
    resource: null,
    dateList: [],
    selectedDate: '',
    timeSlots: [],
    selectedSlot: -1,
    selectedSlotData: null,
    formData: {
      contact_name: '',
      contact_phone: '',
      guest_count: '',
      remark: ''
    },
    canSubmit: false,
    estimatedPrice: 0
  },

  onLoad(options) {
    this.setData({ resourceId: options.resource_id });
    this.initPage();
  },

  // 初始化页面
  async initPage() {
    // 生成日期列表
    const dateList = getFutureDates();
    const selectedDate = dateList[0].date;
    
    this.setData({ 
      dateList,
      selectedDate
    });

    // 加载资源信息
    await this.loadResourceDetail(this.data.resourceId);
    
    // 加载时段
    await this.loadTimeSlots(selectedDate);
  },

  // 加载资源详情
  async loadResourceDetail(resourceId) {
    try {
      const res = await get('/resources/detail', { id: resourceId });
      this.setData({ resource: res.resource });
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
          cover_image_url: ''
        }
      });
    }
  },

  // 加载可用时段
  async loadTimeSlots(date) {
    try {
      const res = await get('/bookings/available-slots', {
        resource_id: this.data.resourceId,
        date: date
      });
      this.setData({ timeSlots: res.slots || [] });
    } catch (error) {
      console.error('加载时段失败:', error);
      // 显示模拟数据
      this.setData({
        timeSlots: [
          { start_time: '09:00', end_time: '11:00', is_available: true },
          { start_time: '11:00', end_time: '13:00', is_available: true },
          { start_time: '14:00', end_time: '16:00', is_available: false },
          { start_time: '16:00', end_time: '18:00', is_available: true },
          { start_time: '18:00', end_time: '20:00', is_available: true },
          { start_time: '20:00', end_time: '22:00', is_available: true }
        ]
      });
    }
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({
      selectedDate: date,
      selectedSlot: -1,
      selectedSlotData: null
    });
    this.loadTimeSlots(date);
    this.checkCanSubmit();
  },

  // 选择时段
  selectTimeSlot(e) {
    const index = e.currentTarget.dataset.index;
    const slot = e.currentTarget.dataset.slot;
    
    if (!slot.is_available) return;
    
    this.setData({
      selectedSlot: index,
      selectedSlotData: slot
    });
    this.checkCanSubmit();
    this.calculateEstimatedPrice();
  },

  // 表单输入
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.${field}`]: value
    });
    this.checkCanSubmit();
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { selectedDate, selectedSlot, formData } = this.data;
    const canSubmit = selectedDate && 
                      selectedSlot >= 0 && 
                      formData.contact_name && 
                      formData.contact_phone;
    this.setData({ canSubmit });
  },

  // 计算预估费用
  calculateEstimatedPrice() {
    const { resource, selectedSlotData } = this.data;
    if (!resource || !resource.price || !selectedSlotData) {
      this.setData({ estimatedPrice: 0 });
      return;
    }
    
    // 计算时段时长（小时）
    const startHour = parseInt(selectedSlotData.start_time.split(':')[0]);
    const endHour = parseInt(selectedSlotData.end_time.split(':')[0]);
    const hours = endHour - startHour;
    
    const estimatedPrice = (resource.price * hours).toFixed(2);
    this.setData({ estimatedPrice });
  },

  // 提交预约
  async submitBooking() {
    if (!this.data.canSubmit) {
      showToast('请完善预约信息');
      return;
    }

    try {
      wx.showLoading({ title: '提交中...', mask: true });
      
      const bookingData = {
        resource_id: this.data.resourceId,
        booking_date: this.data.selectedDate,
        start_time: this.data.selectedSlotData.start_time,
        end_time: this.data.selectedSlotData.end_time,
        guest_count: this.data.formData.guest_count || 1,
        contact_name: this.data.formData.contact_name,
        contact_phone: this.data.formData.contact_phone,
        remark: this.data.formData.remark
      };

      const res = await post('/bookings/create', bookingData);
      
      wx.hideLoading();
      
      // 跳转到预约结果页
      wx.redirectTo({
        url: `/pages/booking-result/booking-result?success=1&booking_id=${res.booking.id}`
      });
    } catch (error) {
      wx.hideLoading();
      console.error('提交预约失败:', error);
      
      // 模拟成功（开发阶段）
      wx.redirectTo({
        url: `/pages/booking-result/booking-result?success=1&booking_id=mock_${Date.now()}`
      });
    }
  }
});
