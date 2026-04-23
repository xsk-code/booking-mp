// utils/util.js
const config = require('../config.js');

// 格式化时间
function formatTime(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('-')} ${[hour, minute, second].map(formatNumber).join(':')}`;
}

// 格式化日期
function formatDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${[year, month, day].map(formatNumber).join('-')}`;
}

// 格式化数字，不足两位补0
function formatNumber(n) {
  n = n.toString();
  return n[1] ? n : `0${n}`;
}

// 获取未来日期列表（用于预约日期选择）
function getFutureDates(days = config.maxBookingDays) {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    dates.push({
      date: formatDate(date),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: getWeekday(date.getDay()),
      isToday: i === 0
    });
  }
  
  return dates;
}

// 获取星期几
function getWeekday(day) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekdays[day];
}

// 解析时间字符串（HH:MM）为分钟数
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// 分钟数转换为时间字符串（HH:MM）
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${formatNumber(hours)}:${formatNumber(mins)}`;
}

// 检查两个时间段是否重叠
function isTimeOverlap(start1, end1, start2, end2) {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  
  return !(e1 <= s2 || e2 <= s1);
}

// 格式化预约状态
function formatBookingStatus(status) {
  const statusMap = {
    'pending': { text: '待审核', class: 'status-pending' },
    'approved': { text: '已通过', class: 'status-approved' },
    'rejected': { text: '已拒绝', class: 'status-rejected' },
    'cancelled': { text: '已取消', class: 'status-cancelled' },
    'expired': { text: '已过期', class: 'status-cancelled' }
  };
  
  return statusMap[status] || { text: status, class: 'status-cancelled' };
}

// 显示确认对话框
function showConfirm(title, content) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: title,
      content: content,
      success: (res) => {
        if (res.confirm) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
      fail: reject
    });
  });
}

// 显示提示信息
function showToast(title, icon = 'none') {
  wx.showToast({
    title: title,
    icon: icon,
    duration: 2000
  });
}

// 复制文本到剪贴板
function copyToClipboard(text) {
  wx.setClipboardData({
    data: text,
    success: () => {
      showToast('复制成功');
    }
  });
}

module.exports = {
  formatTime,
  formatDate,
  formatNumber,
  getFutureDates,
  getWeekday,
  parseTimeToMinutes,
  minutesToTime,
  isTimeOverlap,
  formatBookingStatus,
  showConfirm,
  showToast,
  copyToClipboard
};
