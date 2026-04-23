// utils/request.js
const config = require('../config.js');
const app = getApp();

// 基础请求封装
function request(options) {
  return new Promise((resolve, reject) => {
    const { url, method, data, header = {} } = options;
    
    // 添加认证 token
    const token = wx.getStorageSync('token');
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    wx.request({
      url: `${config.apiBaseUrl}${url}`,
      method: method || 'GET',
      data: data,
      header: {
        'Content-Type': 'application/json',
        ...header
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // 未登录，清除登录状态
          app.logout();
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
          reject(new Error('未登录'));
        } else {
          wx.showToast({
            title: res.data.message || '请求失败',
            icon: 'none'
          });
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

// GET 请求
function get(url, data = {}) {
  return request({
    url,
    method: 'GET',
    data
  });
}

// POST 请求
function post(url, data = {}) {
  return request({
    url,
    method: 'POST',
    data
  });
}

// PUT 请求
function put(url, data = {}) {
  return request({
    url,
    method: 'PUT',
    data
  });
}

// DELETE 请求
function del(url, data = {}) {
  return request({
    url,
    method: 'DELETE',
    data
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  del
};
