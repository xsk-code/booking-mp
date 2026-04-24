// pages/my-venues/resource-manage/resource-manage.js
const app = getApp();
const { get, post } = require('../../../utils/request.js');

Page({
  data: {
    venueId: '',
    resourceList: [],
    loading: true,
    showAddDialog: false,
    editResource: null,
    formData: {
      name: '',
      type: 'room',
      capacity: 1,
      description: '',
      price: '',
      sort_order: 0
    }
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
    this.loadResourceList();
  },

  onPullDownRefresh() {
    this.loadResourceList().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadResourceList() {
    const { venueId } = this.data;
    
    if (!venueId) {
      this.setData({ loading: false, resourceList: [] });
      return;
    }

    try {
      this.setData({ loading: true });

      const res = await get('/resources/list', { venue_id: venueId });
      
      this.setData({
        resourceList: res.resources || [],
        loading: false
      });
    } catch (error) {
      console.error('加载资源列表失败:', error);
      this.setData({
        resourceList: [],
        loading: false
      });
    }
  },

  showAddDialog() {
    this.setData({
      showAddDialog: true,
      editResource: null,
      formData: {
        name: '',
        type: 'room',
        capacity: 1,
        description: '',
        price: '',
        sort_order: 0
      }
    });
  },

  showEditDialog(e) {
    const resource = e.currentTarget.dataset.resource;
    this.setData({
      showAddDialog: true,
      editResource: resource,
      formData: {
        name: resource.name,
        type: resource.type || 'room',
        capacity: resource.capacity || 1,
        description: resource.description || '',
        price: resource.price || '',
        sort_order: resource.sort_order || 0
      }
    });
  },

  closeDialog() {
    this.setData({
      showAddDialog: false,
      editResource: null
    });
  },

  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  onTypeChange(e) {
    const types = ['room', 'table', 'equipment'];
    const index = e.detail.value;
    this.setData({
      'formData.type': types[index]
    });
  },

  onCapacityInput(e) {
    this.setData({
      'formData.capacity': parseInt(e.detail.value) || 1
    });
  },

  onDescriptionInput(e) {
    this.setData({
      'formData.description': e.detail.value
    });
  },

  onPriceInput(e) {
    this.setData({
      'formData.price': e.detail.value
    });
  },

  async onSubmit() {
    const { venueId, formData, editResource } = this.data;

    if (!formData.name || formData.name.trim() === '') {
      wx.showToast({
        title: '请输入资源名称',
        icon: 'none'
      });
      return;
    }

    try {
      let res;
      
      if (editResource) {
        res = await post('/resources/update', {
          resource_id: editResource.id,
          ...formData
        });
      } else {
        res = await post('/resources/create', {
          venue_id: venueId,
          ...formData
        });
      }

      if (res.success) {
        wx.showToast({
          title: editResource ? '保存成功' : '添加成功',
          icon: 'success'
        });
        this.closeDialog();
        this.loadResourceList();
      }
    } catch (error) {
      console.error('提交失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  async onToggleStatus(e) {
    const resource = e.currentTarget.dataset.resource;
    const newStatus = resource.status === 'active' ? 'disabled' : 'active';

    try {
      const res = await post('/resources/update', {
        resource_id: resource.id,
        status: newStatus
      });

      if (res.success) {
        wx.showToast({
          title: newStatus === 'active' ? '已启用' : '已停用',
          icon: 'success'
        });
        this.loadResourceList();
      }
    } catch (error) {
      console.error('切换状态失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  async onDelete(e) {
    const resource = e.currentTarget.dataset.resource;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除资源"${resource.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await post('/resources/delete', {
              resource_id: resource.id
            });

            if (result.success) {
              wx.showToast({
                title: '已删除',
                icon: 'success'
              });
              this.loadResourceList();
            }
          } catch (error) {
            console.error('删除失败:', error);
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  goToTimeSlotManage(e) {
    const resourceId = e.currentTarget.dataset.id;
    const resourceName = e.currentTarget.dataset.name;
    
    wx.setStorageSync('currentResource', {
      id: resourceId,
      name: resourceName
    });

    wx.navigateTo({
      url: `/pages/my-venues/time-slot-manage/time-slot-manage?resource_id=${resourceId}`
    });
  }
});
