// pages/my-venues/venue-edit/venue-edit.js
const app = getApp();
const { get, post } = require('../../../utils/request.js');

Page({
  data: {
    venueId: '',
    isEdit: false,
    venueInfo: {
      name: '',
      address: '',
      contact_phone: '',
      description: '',
      business_start: '09:00',
      business_end: '22:00',
      slot_duration: 120
    },
    venueCode: '',
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        venueId: options.id,
        isEdit: true
      });
      this.loadVenueDetail(options.id);
    }
  },

  async loadVenueDetail(venueId) {
    try {
      const res = await get('/venues/detail', { id: venueId });
      
      if (res.success && res.venue) {
        this.setData({
          venueInfo: {
            name: res.venue.name || '',
            address: res.venue.address || '',
            contact_phone: res.venue.contact_phone || '',
            description: res.venue.description || '',
            business_start: res.venue.business_start || '09:00',
            business_end: res.venue.business_end || '22:00',
            slot_duration: res.venue.slot_duration || 120
          },
          venueCode: res.venue.venue_code || ''
        });
      }
    } catch (error) {
      console.error('加载场地详情失败:', error);
    }
  },

  onNameInput(e) {
    this.setData({
      'venueInfo.name': e.detail.value
    });
  },

  onAddressInput(e) {
    this.setData({
      'venueInfo.address': e.detail.value
    });
  },

  onPhoneInput(e) {
    this.setData({
      'venueInfo.contact_phone': e.detail.value
    });
  },

  onDescriptionInput(e) {
    this.setData({
      'venueInfo.description': e.detail.value
    });
  },

  onStartTimeChange(e) {
    this.setData({
      'venueInfo.business_start': e.detail.value
    });
  },

  onEndTimeChange(e) {
    this.setData({
      'venueInfo.business_end': e.detail.value
    });
  },

  onSlotDurationChange(e) {
    const durations = [60, 90, 120, 180];
    const index = e.detail.value;
    this.setData({
      'venueInfo.slot_duration': durations[index]
    });
  },

  async onSubmit() {
    const { venueInfo, isEdit, venueId } = this.data;

    if (!venueInfo.name || venueInfo.name.trim() === '') {
      wx.showToast({
        title: '请输入场地名称',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ submitting: true });

      let res;
      
      if (isEdit) {
        res = await post('/venues/update', {
          venue_id: venueId,
          ...venueInfo
        });
      } else {
        res = await post('/venues/create', venueInfo);
      }

      if (res.success) {
        wx.showToast({
          title: isEdit ? '保存成功' : '创建成功',
          icon: 'success'
        });

        if (!isEdit && res.venue) {
          this.setData({
            venueCode: res.venue.venue_code
          });
        }

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('提交失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  copyVenueCode() {
    const { venueCode } = this.data;
    if (venueCode) {
      wx.setClipboardData({
        data: venueCode,
        success: () => {
          wx.showToast({
            title: '已复制场地码',
            icon: 'success'
          });
        }
      });
    }
  },

  showQrCode() {
    wx.showToast({
      title: '二维码生成中...',
      icon: 'loading'
    });
  }
});
