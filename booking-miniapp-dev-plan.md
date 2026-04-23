# 预约小程序开发方案

> 技术栈：微信小程序 + Vercel Serverless + Supabase
>
> 核心流程：用户提交预约 → 管理员审核 → 预约成功/失败

---

## 一、项目概述

### 1.1 产品定位

面向小型商户（如棋牌室、茶室、会议室、餐厅包间等）的预约管理小程序，支持用户在线预约房间/桌号，管理员审核确认后完成预约。

### 1.2 核心角色

| 角色 | 说明 |
|------|------|
| 普通用户 | 浏览资源、提交预约、查看预约状态、取消预约 |
| 管理员 | 审核预约、管理资源、查看统计、管理门店 |

### 1.3 核心业务流程

```
用户浏览资源 → 选择资源+日期+时段 → 填写预约信息 → 提交预约申请
                                                          ↓
                                              管理员收到待审核通知
                                                          ↓
                                              ┌── 审核通过 ──→ 预约成功 → 通知用户
                                              └── 审核拒绝 ──→ 预约失败 → 通知用户（附原因）
```

---

## 二、技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    微信小程序（前端）                       │
│         uni-app / 原生小程序                              │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│   Vercel Serverless  │  │      Supabase                │
│   (API 层)           │  │                              │
│                      │  │  ┌─ PostgreSQL 数据库         │
│  ┌─ /api/booking     │  │  ├─ Auth 认证服务             │
│  ├─ /api/resource    │  │  ├─ Realtime 实时订阅         │
│  ├─ /api/venue       │──│─→├─ Storage 文件存储          │
│  ├─ /api/admin       │  │  └─ RLS 行级安全策略          │
│  └─ /api/auth        │  │                              │
└──────────────────────┘  └──────────────────────────────┘
               │
               ▼
┌──────────────────────┐
│   微信订阅消息        │
│   (审核结果推送)      │
└──────────────────────┘
```

### 2.2 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | 微信小程序（原生或 uni-app） | 用户端 + 管理员端共用一个小程序，通过角色切换 |
| **API 层** | Vercel Serverless Functions | 无需运维服务器，按调用计费，自动扩缩容 |
| **数据库** | Supabase PostgreSQL | 托管 PostgreSQL，自带 RLS、Realtime、Auth |
| **认证** | 微信登录 + Supabase Auth | 小程序 wx.login 获取 openid，绑定 Supabase 用户 |
| **实时推送** | Supabase Realtime | 管理员实时收到新预约通知 |
| **文件存储** | Supabase Storage | 存储场地/资源图片 |
| **消息通知** | 微信订阅消息 | 审核结果推送给用户 |
| **缓存** | Supabase 内置 | 利用 PostgreSQL 索引 + 连接池，MVP 阶段无需额外缓存 |

### 2.3 为什么选 Vercel + Supabase

| 维度 | 优势 |
|------|------|
| **零运维** | Vercel 自动部署、扩缩容；Supabase 托管数据库，无需维护服务器 |
| **低成本** | MVP 阶段两者免费额度足够，后期按量付费 |
| **开发效率** | Vercel 与 GitHub 集成，push 即部署；Supabase 提供 Dashboard 可视化管理 |
| **实时能力** | Supabase Realtime 天然支持预约状态变更的实时推送 |
| **安全** | Supabase RLS 行级安全策略，数据层面控制访问权限 |

---

## 三、数据库设计（Supabase PostgreSQL）

### 3.1 ER 关系图

```
user ──< booking >── resource ──< resource_time_slot
  │                     │
  │                     └── venue
  │
  └── admin_audit_log
```

### 3.2 表结构定义

#### 3.2.1 用户表 `users`

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid      VARCHAR(64) UNIQUE NOT NULL,    -- 微信 openid
  union_id    VARCHAR(64),                     -- 微信 unionid（可选）
  nickname    VARCHAR(64),
  avatar_url  TEXT,
  phone       VARCHAR(20),
  role        VARCHAR(20) NOT NULL DEFAULT 'user',  -- user / admin
  status      VARCHAR(20) NOT NULL DEFAULT 'active', -- active / blacklisted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_role ON users(role);
```

#### 3.2.2 场地/门店表 `venues`

```sql
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(128) NOT NULL,
  description     TEXT,
  address         VARCHAR(256),
  cover_image_url TEXT,
  contact_phone   VARCHAR(20),
  business_start  TIME NOT NULL DEFAULT '09:00',  -- 营业开始时间
  business_end    TIME NOT NULL DEFAULT '22:00',  -- 营业结束时间
  slot_duration   INTEGER NOT NULL DEFAULT 120,    -- 时段时长（分钟）
  owner_id        UUID REFERENCES users(id),       -- 场地所有者/管理员
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 3.2.3 可预约资源表 `resources`

```sql
CREATE TABLE resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  type            VARCHAR(32) NOT NULL,        -- room / table / equipment
  name            VARCHAR(128) NOT NULL,        -- 如：A01包间、3号桌
  description     TEXT,
  capacity        INTEGER NOT NULL DEFAULT 1,   -- 容纳人数
  cover_image_url TEXT,
  price           DECIMAL(10,2),                -- 单价（可选）
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active / maintenance / disabled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_venue_id ON resources(venue_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_status ON resources(status);
```

#### 3.2.4 资源时段规则表 `resource_time_slots`

```sql
CREATE TABLE resource_time_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  weekday         SMALLINT NOT NULL,            -- 0=周日, 1=周一, ..., 6=周六
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  is_available    BOOLEAN NOT NULL DEFAULT true, -- 该时段是否开放预约
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rts_resource_weekday ON resource_time_slots(resource_id, weekday);
```

#### 3.2.5 预约订单表 `bookings`

```sql
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  resource_id     UUID NOT NULL REFERENCES resources(id),
  venue_id        UUID NOT NULL REFERENCES venues(id),
  booking_date    DATE NOT NULL,                 -- 预约日期
  start_time      TIME NOT NULL,                 -- 开始时间
  end_time        TIME NOT NULL,                 -- 结束时间
  guest_count     INTEGER NOT NULL DEFAULT 1,    -- 预约人数
  contact_name    VARCHAR(64) NOT NULL,          -- 联系人姓名
  contact_phone   VARCHAR(20) NOT NULL,          -- 联系人电话
  remark          TEXT,                           -- 用户备注
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending:   待审核
    -- approved:  已通过
    -- rejected:  已拒绝
    -- cancelled: 已取消（用户主动）
    -- expired:   已过期（审核超时自动取消）
  reject_reason   TEXT,                           -- 拒绝原因
  reviewed_by     UUID REFERENCES users(id),      -- 审核人
  reviewed_at     TIMESTAMPTZ,                    -- 审核时间
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_resource_date ON bookings(resource_id, booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_venue_status ON bookings(venue_id, status);

-- 唯一约束：同一资源同一日期同一时段不可重复预约（仅限有效状态）
CREATE UNIQUE INDEX idx_bookings_no_conflict
  ON bookings (resource_id, booking_date, start_time)
  WHERE status IN ('pending', 'approved');
```

#### 3.2.6 审核日志表 `audit_logs`

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  operator_id     UUID NOT NULL REFERENCES users(id),
  action          VARCHAR(32) NOT NULL,  -- approve / reject / cancel
  remark          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_booking_id ON audit_logs(booking_id);
```

### 3.3 RLS（行级安全策略）

Supabase 的 RLS 是核心安全机制，在数据层面控制访问权限：

```sql
-- 启用 RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的预约
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

-- 管理员可查看所属场地的所有预约
CREATE POLICY "Admins can view venue bookings"
  ON bookings FOR SELECT
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE owner_id = auth.uid()
    )
  );

-- 管理员可更新预约状态（审核）
CREATE POLICY "Admins can update bookings"
  ON bookings FOR UPDATE
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE owner_id = auth.uid()
    )
  );

-- 所有认证用户可查看可用资源
CREATE POLICY "Authenticated users can view active resources"
  ON resources FOR SELECT
  USING (status = 'active');

-- 仅管理员可增删改资源
CREATE POLICY "Admins can manage resources"
  ON resources FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE owner_id = auth.uid()
    )
  );
```

### 3.4 数据库触发器

```sql
-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 审核通过时自动记录审核日志
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO audit_logs (booking_id, operator_id, action, remark)
    VALUES (NEW.id, NEW.reviewed_by, NEW.status, NEW.reject_reason);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_audit
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION log_audit();
```

---

## 四、API 设计（Vercel Serverless Functions）

### 4.1 项目结构

```
api/
├── auth/
│   └── login.ts              # 微信登录
├── venues/
│   ├── list.ts               # 场地列表
│   ├── detail.ts             # 场地详情
│   └── create.ts             # 创建场地（管理员）
├── resources/
│   ├── list.ts               # 资源列表
│   ├── detail.ts             # 资源详情
│   ├── create.ts             # 创建资源（管理员）
│   ├── update.ts             # 更新资源（管理员）
│   └── time-slots.ts         # 资源可用时段
├── bookings/
│   ├── create.ts             # 创建预约
│   ├── list.ts               # 预约列表（用户）
│   ├── detail.ts             # 预约详情
│   ├── cancel.ts             # 取消预约
│   └── available-slots.ts    # 查询某资源某日可用时段
├── admin/
│   ├── bookings/
│   │   ├── pending-list.ts   # 待审核列表
│   │   ├── approve.ts        # 审核通过
│   │   └── reject.ts         # 审核拒绝
│   ├── resources/
│   │   ├── create.ts         # 创建资源
│   │   ├── update.ts         # 更新资源
│   │   └── delete.ts         # 删除资源
│   ├── venues/
│   │   ├── create.ts         # 创建场地
│   │   └── update.ts         # 更新场地
│   └── stats/
│       └── overview.ts       # 统计概览
└── _utils/
    ├── supabase.ts           # Supabase 客户端
    ├── auth.ts               # 认证中间件
    └── wechat.ts             # 微信 API 工具
```

### 4.2 核心 API 定义

#### 认证相关

```
POST /api/auth/login
请求：{ code: string }  // wx.login 获取的 code
响应：{ token, user, is_new_user }
逻辑：
  1. 用 code 调用微信 code2Session 获取 openid
  2. 查询 users 表，不存在则创建
  3. 签发 Supabase JWT token
  4. 返回 token + 用户信息
```

#### 预约相关

```
GET /api/bookings/available-slots?resource_id=&date=
响应：{ slots: [{ start_time, end_time, is_available }] }
逻辑：
  1. 查询 resource_time_slots 获取该资源在对应星期的时段
  2. 查询 bookings 获取该资源该日期已被预约的时段
  3. 计算可用时段返回

POST /api/bookings/create
请求：{
  resource_id, booking_date, start_time, end_time,
  guest_count, contact_name, contact_phone, remark
}
响应：{ booking }
逻辑：
  1. 校验时段是否可用（防冲突）
  2. 插入 bookings 记录（status=pending）
  3. 通过 Supabase Realtime 通知管理员
  4. 返回预约信息

POST /api/bookings/cancel
请求：{ booking_id }
逻辑：
  1. 校验预约属于当前用户且状态为 pending/approved
  2. 更新 status = cancelled
```

#### 管理员审核

```
GET /api/admin/bookings/pending-list?venue_id=
响应：{ bookings: [...] }

POST /api/admin/bookings/approve
请求：{ booking_id }
逻辑：
  1. 校验当前用户是该场地管理员
  2. 更新 status = approved, reviewed_by, reviewed_at
  3. 发送微信订阅消息通知用户

POST /api/admin/bookings/reject
请求：{ booking_id, reject_reason }
逻辑：
  1. 校验当前用户是该场地管理员
  2. 更新 status = rejected, reject_reason, reviewed_by, reviewed_at
  3. 发送微信订阅消息通知用户
```

### 4.3 认证中间件

```typescript
// api/_utils/auth.ts
import { verify } from 'jsonwebtoken';

export function authenticate(req: VercelRequest): { userId: string; role: string } {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new AuthError('未登录');

  const payload = verify(token, process.env.JWT_SECRET);
  return { userId: payload.sub, role: payload.role };
}

export function requireAdmin(req: VercelRequest) {
  const { role } = authenticate(req);
  if (role !== 'admin') throw new AuthError('无权限');
}
```

### 4.4 防并发预约冲突

```typescript
// api/bookings/create.ts 核心逻辑
async function createBooking(params: CreateBookingParams) {
  const { resource_id, booking_date, start_time, end_time } = params;

  // 利用数据库唯一索引 idx_bookings_no_conflict 防止并发冲突
  // 该索引在 status IN ('pending', 'approved') 时强制唯一
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...params,
      status: 'pending',
    })
    .select()
    .single();

  if (error?.code === '23505') {
    // 唯一约束冲突
    throw new ConflictError('该时段已被预约');
  }

  return data;
}
```

---

## 五、前端设计

### 5.1 技术方案

| 选项 | 说明 | 推荐 |
|------|------|------|
| 微信原生小程序 | 性能最优，但仅限微信 | ✅ MVP 推荐 |
| uni-app | 跨平台，可同时出 H5/支付宝等 | 后期可迁移 |

### 5.2 页面结构

```
pages/
├── index/                    # 首页 - 场地列表
├── venue-detail/             # 场地详情 - 资源列表
├── resource-detail/          # 资源详情 - 图片/描述/容量
├── booking/                  # 预约页面 - 选日期/时段/填信息
├── booking-result/           # 预约提交结果页
├── my-bookings/              # 我的预约列表
├── booking-detail/           # 预约详情
├── admin/
│   ├── dashboard/            # 管理后台首页
│   ├── pending-bookings/     # 待审核列表
│   ├── booking-calendar/     # 预约日历视图
│   ├── resource-manage/      # 资源管理
│   ├── venue-settings/       # 场地设置
│   └── stats/                # 数据统计
└── profile/                  # 个人中心
```

### 5.3 核心页面说明

#### 首页（场地列表）
- 展示所有可用场地，卡片式布局
- 每张卡片：封面图、名称、地址、营业时间
- 点击进入场地详情

#### 预约页面
- 顶部：资源名称 + 基本信息
- 日期选择器：可选未来 7/14 天
- 时段选择：根据可用时段展示，已占用的置灰
- 表单：联系人、手机号、人数、备注
- 提交按钮

#### 我的预约
- Tab 切换：全部 / 待审核 / 已通过 / 已拒绝 / 已取消
- 列表项：资源名、日期时段、状态标签
- 待审核状态可点击"取消预约"

#### 管理后台 - 待审核
- 新预约实时提醒（Supabase Realtime）
- 列表展示待审核预约
- 滑动操作：通过 / 拒绝（弹出输入拒绝原因）

#### 管理后台 - 预约日历
- 日历视图，每天显示各资源的预约情况
- 不同状态用不同颜色标记
- 点击可查看详情

### 5.4 关键交互流程

```
预约页面交互：
1. 用户选择日期 → 请求 /api/bookings/available-slots
2. 渲染时段列表，已占用时段置灰不可选
3. 用户选择时段 → 填写信息 → 点击提交
4. 调用 /api/bookings/create
5. 成功 → 跳转预约结果页（提示"已提交，等待审核"）
6. 失败（冲突）→ 提示"该时段已被预约，请重新选择"
```

---

## 六、认证流程

### 6.1 微信登录 + Supabase Auth 集成

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  小程序   │     │  Vercel  │     │   微信    │     │ Supabase │
│  wx.login │────→│  /login  │────→│ code2Sess│────→│          │
│          │←────│          │←────│  openid  │     │          │
│          │     │          │─────────────────────→│ 查/建用户 │
│          │     │          │←─────────────────────│ user数据  │
│          │←────│ JWT token│     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### 6.2 实现步骤

1. 小程序端调用 `wx.login()` 获取 `code`
2. 将 `code` 发送到 `/api/auth/login`
3. 后端用 `code` 调用微信 `code2Session` 接口获取 `openid`
4. 在 Supabase `users` 表中查找或创建用户
5. 签发自定义 JWT（包含 `sub=userId`, `role=user/admin`）
6. 返回 token 给小程序，后续请求携带 `Authorization: Bearer <token>`

### 6.3 管理员身份

- 管理员通过后台手动设置 `users.role = 'admin'`
- 或首次创建场地时自动升级为 admin
- JWT 中包含 role 字段，API 层据此做权限判断

---

## 七、预约状态机

```
                    ┌──────────┐
                    │ pending  │ ← 用户提交
                    │ (待审核)  │
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ approved │ │ rejected │ │ cancelled│
        │ (已通过)  │ │ (已拒绝)  │ │ (已取消)  │
        └────┬─────┘ └──────────┘ └──────────┘
             │
             ▼
        ┌──────────┐
        │ completed│
        │ (已完成)  │
        └──────────┘

状态转换规则：
- pending  → approved   : 管理员审核通过
- pending  → rejected   : 管理员审核拒绝
- pending  → cancelled  : 用户主动取消
- pending  → expired    : 审核超时自动取消（可选）
- approved → cancelled  : 用户取消（需在规定时间内）
- approved → completed  : 预约时间到期自动完成（可选）
```

---

## 八、消息通知方案

### 8.1 微信订阅消息

| 通知场景 | 模板名称 | 接收人 | 触发时机 |
|----------|----------|--------|----------|
| 新预约提醒 | 预约通知 | 管理员 | 用户提交预约时 |
| 审核通过通知 | 审核结果通知 | 用户 | 管理员审核通过时 |
| 审核拒绝通知 | 审核结果通知 | 用户 | 管理员审核拒绝时 |
| 预约取消通知 | 取消通知 | 管理员 | 用户取消预约时 |
| 预约提醒 | 预约提醒 | 用户 | 预约时间前1小时（可选） |

### 8.2 Supabase Realtime（管理员端实时通知）

```typescript
// 管理员端监听新预约
const subscription = supabase
  .channel('admin-new-booking')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bookings',
    filter: `venue_id=eq.${venueId}`
  }, (payload) => {
    // 播放提示音 + 显示新预约通知
    showNewBookingNotification(payload.new);
  })
  .subscribe();
```

---

## 九、环境变量配置

### 9.1 Vercel 环境变量

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...

# 微信小程序
WECHAT_APPID=wx...
WECHAT_SECRET=...

# JWT
JWT_SECRET=your-jwt-secret

# 其他
BOOKING_EXPIRE_HOURS=24    # 审核超时时间（小时）
```

### 9.2 小程序端配置

```javascript
// config.js
module.exports = {
  apiBaseUrl: 'https://your-vercel-app.vercel.app/api',
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

---

## 十、开发阶段规划

### Phase 1：MVP（核心流程跑通）

**目标：** 用户能预约，管理员能审核

| 任务 | 说明 |
|------|------|
| Supabase 项目搭建 | 创建项目、建表、配置 RLS |
| Vercel 项目搭建 | 初始化项目、配置环境变量 |
| 微信登录 | wx.login → 获取用户信息 |
| 场地/资源浏览 | 首页列表 → 场地详情 → 资源详情 |
| 预约提交 | 选日期时段 → 填信息 → 提交 |
| 预约列表 | 我的预约（用户端） |
| 管理员审核 | 待审核列表 → 通过/拒绝 |
| 时段冲突校验 | 提交时校验 + 数据库唯一索引 |

### Phase 2：体验优化

| 任务 | 说明 |
|------|------|
| 微信订阅消息 | 审核结果推送给用户 |
| Supabase Realtime | 管理员实时收到新预约 |
| 预约日历视图 | 管理员日历查看预约情况 |
| 取消预约 | 用户取消 + 通知管理员 |
| 审核超时自动取消 | 定时任务清理过期待审核预约 |
| 资源管理 | 管理员增删改资源 |

### Phase 3：运营增强

| 任务 | 说明 |
|------|------|
| 数据统计 | 预约量、资源利用率、热门时段 |
| 黑名单 | 爽约用户限制预约 |
| 多管理员 | 支持一个场地多个管理员 |
| 资源图片上传 | Supabase Storage 存储 |
| 场地设置 | 营业时间、时段规则配置 |

### Phase 4：商业扩展（可选）

| 任务 | 说明 |
|------|------|
| 在线支付 | 微信支付，预约需预付定金 |
| 会员体系 | 会员卡、积分、折扣 |
| 多门店 | 一个管理员管理多个场地 |
| H5 版本 | uni-app 编译为 H5 |
| 分享裂变 | 生成分享海报、邀请有礼 |

---

## 十一、Supabase 免费额度评估

| 资源 | 免费额度 | MVP 是否够用 |
|------|----------|-------------|
| 数据库 | 500MB | ✅ 绰绰有余 |
| Storage | 1GB | ✅ 图片量不大够用 |
| Auth | 50,000 MAU | ✅ 远超需求 |
| Realtime | 200 并发连接 | ✅ 管理员端够用 |
| Bandwidth | 5GB/月 | ✅ 够用 |

> Vercel 免费额度：100GB 带宽/月，Serverless Function 10秒超时，100次/天部署。MVP 阶段完全够用。

---

## 十二、风险与应对

| 风险 | 应对方案 |
|------|----------|
| 并发预约冲突 | 数据库唯一索引兜底 + 应用层先查后插 |
| Serverless 冷启动延迟 | Vercel 函数保持精简，冷启动通常 < 1s |
| 微信订阅消息需用户主动触发订阅 | 在预约提交成功页引导用户勾选订阅 |
| Supabase Realtime 连接数限制 | MVP 阶段管理员少，不会超限；后期可升级 |
| 审核超时占用资源 | 设置定时清理任务（Vercel Cron Jobs） |
