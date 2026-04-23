// pages/admin/resource-manage/resource-manage.js
Page({
  data: {
    resourceList: [
      {
        id: '1',
        name: 'A01 豪华包间',
        type: 'room',
        capacity: 8,
        status: 'active'
      },
      {
        id: '2',
        name: 'A02 标准包间',
        type: 'room',
        capacity: 6,
        status: 'active'
      },
      {
        id: '3',
        name: 'B01 大厅桌位',
        type: 'table',
        capacity: 4,
        status: 'active'
      }
    ]
  },

  onLoad() {
    
  }
});
