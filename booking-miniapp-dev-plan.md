# 预约小程序开发方案

> 技术栈：微信小程序 + Vercel Serverless + Supabase
>
> 核心流程：用户提交预约 → 场地所有者审核 → 预约成功/失败

---

## 一、项目概述

### 1.1 产品定位

面向小型商户（如棋牌室、茶室、会议室、餐厅包间等）的预约管理小程序，支持用户在线预约房间/桌号，场地所有者审核确认后完成预约。

> **核心理念**：不区分管理员与用户角色，所有人都可以创建场地、分享场地、提交预约和审核预约。权限由"场地所有者"关系自然决定——谁创建的场地，谁就拥有该场地的管理权和审核权。

### 1.2 核心角色

本系统不设独立的管理员角色，所有用户拥有相同的基础能力：

| 能力 | 说明 |
|------|------|
| 创建场地 | 任何用户都可以创建场地，创建者自动成为该场地的所有者 |
| 分享场地 | 场地所有者可生成场地码/二维码，分享给他人 |
| 提交预约 | 任何用户通过扫码/搜索场地码进入场地后可提交预约 |
| 审核预约 | 场地所有者可审核该场地下的预约申请 |
| 管理场地 | 场地所有者可管理自己场地的房间号、时段等 |

> **权限模型**：基于"场地所有者"关系而非"角色"字段。用户 A 创建了场地 X，则 A 拥有场地 X 的管理权；同时 A 也可以扫码进入场地 Y 提交预约。同一个人可以是多个场地的所有者，也可以是其他场地的预约者。

### 1.3 核心业务流程

```
任何用户创建场地 → 生成场地码/二维码 → 分享给他人
                                              ↓
他人扫码/搜索场地码 → 进入场地 → 选择资源+日期+时段 → 填写预约信息 → 提交预约申请
                                                                              ↓
                                                                  场地所有者收到待审核通知
                                                                              ↓
                                                                  ┌── 审核通过 ──→ 预约成功 → 通知预约者
                                                                  └── 审核拒绝 ──→ 预约失败 → 通知预约者（附原因）
```

> **关键设计**：
> 1. 用户端首页不展示场地列表，用户必须通过扫描场地二维码或搜索场地码才能进入场地预约，确保场地信息私密性，同时简化用户决策路径。
> 2. 不区分管理员/用户角色，权限由"场地所有者"关系自然决定。场地所有者既能管理自己的场地、审核预约，也能扫码预约其他人的场地。

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
| **前端** | 微信小程序（原生或 uni-app） | 用户端 + 场地管理共用一个小程序，按场地所有者关系切换 |
| **API 层** | Vercel Serverless Functions | 无需运维服务器，按调用计费，自动扩缩容 |
| **数据库** | Supabase PostgreSQL | 托管 PostgreSQL，自带 RLS、Realtime、Auth |
| **认证** | 微信登录 + Supabase Auth | 小程序 wx.login 获取 openid，绑定 Supabase 用户 |
| **实时推送** | Supabase Realtime | 场地所有者实时收到新预约通知 |
| **文件存储** | Supabase Storage | 存储场地/资源图片 |
| **消息通知** | 微信订阅消息 | 审核结果推送给预约者 |
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
  status      VARCHAR(20) NOT NULL DEFAULT 'active', -- active / blacklisted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_openid ON users(openid);
```

> **说明**：不设 `role` 字段。权限由"场地所有者"关系决定——通过 `venues.creator_id` 判断用户是否为某场地的所有者，而非全局角色。

#### 3.2.2 场地/门店表 `venues`

```sql
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_code      VARCHAR(16) UNIQUE NOT NULL,   -- 场地码，用户扫码/搜索入口（6位大写字母+数字，如 QT8A2F）
  name            VARCHAR(128) NOT NULL,
  description     TEXT,
  address         VARCHAR(256),
  cover_image_url TEXT,
  contact_phone   VARCHAR(20),
  business_start  TIME NOT NULL DEFAULT '09:00',  -- 营业开始时间
  business_end    TIME NOT NULL DEFAULT '22:00',  -- 营业结束时间
  slot_duration   INTEGER NOT NULL DEFAULT 120,    -- 时段时长（分钟）
  creator_id      UUID NOT NULL REFERENCES users(id), -- 场地创建者/所有者
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_venue_code ON venues(venue_code);
CREATE INDEX idx_venues_creator_id ON venues(creator_id);
```

> **venue_code 设计说明**：
> - 创建场地时自动生成 6 位随机码（大写字母 + 数字），确保唯一性
> - 场地所有者可在场地设置中自定义修改场地码
> - 场地码是用户进入场地的唯一入口，用于扫码和搜索
> - 二维码内容格式：`booking://venue?code=QT8A2F`
> - `creator_id` 标识场地所有者，拥有该场地的管理权和审核权

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

Supabase 的 RLS 是核心安全机制，在数据层面控制访问权限。权限基于"场地所有者"关系而非全局角色：

```sql
-- 启用 RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_time_slots ENABLE ROW LEVEL SECURITY;

-- 预约：用户可查看自己的预约
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (user_id = auth.uid());

-- 预约：场地所有者可查看所属场地的所有预约
CREATE POLICY "Venue owners can view venue bookings"
  ON bookings FOR SELECT
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE creator_id = auth.uid()
    )
  );

-- 预约：场地所有者可更新预约状态（审核）
CREATE POLICY "Venue owners can update bookings"
  ON bookings FOR UPDATE
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE creator_id = auth.uid()
    )
  );

-- 资源：所有认证用户可查看可用资源
CREATE POLICY "Authenticated users can view active resources"
  ON resources FOR SELECT
  USING (status = 'active');

-- 资源：场地所有者可增删改自己场地的资源
CREATE POLICY "Venue owners can manage resources"
  ON resources FOR ALL
  USING (
    venue_id IN (
      SELECT id FROM venues WHERE creator_id = auth.uid()
    )
  );

-- 场地：场地所有者可查看和修改自己的场地
CREATE POLICY "Venue owners can manage own venues"
  ON venues FOR ALL
  USING (creator_id = auth.uid());

-- 场地：所有认证用户可通过 venue_code 查询场地（用于搜索/扫码）
CREATE POLICY "Users can search venues by code"
  ON venues FOR SELECT
  USING (status = 'active');

-- 时段：场地所有者可管理自己场地的时段
CREATE POLICY "Venue owners can manage time slots"
  ON resource_time_slots FOR ALL
  USING (
    resource_id IN (
      SELECT r.id FROM resources r
      JOIN venues v ON r.venue_id = v.id
      WHERE v.creator_id = auth.uid()
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
│   ├── search.ts             # 场地码搜索（扫码/搜索入口）
│   ├── detail.ts             # 场地详情
│   ├── create.ts             # 创建场地（任何用户，自动生成 venue_code）
│   ├── update.ts             # 更新场地（仅场地所有者）
│   └── my-venues.ts          # 我创建的场地列表
├── resources/
│   ├── list.ts               # 资源列表
│   ├── detail.ts             # 资源详情
│   ├── create.ts             # 创建资源/添加房间号（仅场地所有者）
│   ├── update.ts             # 更新资源（仅场地所有者）
│   ├── delete.ts             # 删除资源（仅场地所有者）
│   └── time-slots.ts         # 资源可用时段（用户端查询）
├── time-slots/
│   ├── list.ts               # 时段列表（按资源查询，仅场地所有者）
│   ├── save.ts               # 批量保存时段（仅场地所有者）
│   └── toggle.ts             # 切换时段可用状态（仅场地所有者）
├── bookings/
│   ├── create.ts             # 创建预约
│   ├── list.ts               # 预约列表（用户自己的）
│   ├── detail.ts             # 预约详情
│   ├── cancel.ts             # 取消预约
│   ├── available-slots.ts    # 查询某资源某日可用时段
│   ├── pending-list.ts       # 待审核列表（场地所有者查看）
│   ├── approve.ts            # 审核通过（仅场地所有者）
│   └── reject.ts             # 审核拒绝（仅场地所有者）
├── stats/
│   └── overview.ts           # 统计概览（场地所有者查看）
└── _utils/
    ├── supabase.ts           # Supabase 客户端
    ├── auth.ts               # 认证中间件
    └── wechat.ts             # 微信 API 工具
```

> **设计说明**：不再区分 `/api/admin/` 和 `/api/user/`，所有接口统一按资源路径组织。权限校验通过"是否为场地所有者"判断，而非全局角色。

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

#### 场地码搜索（扫码/搜索入口）

```
GET /api/venues/search?code=QT8A2F
响应：{ success: true, venue: { id, name, address, business_start, business_end, ... } }
逻辑：
  1. 按 venue_code 查询 venues 表
  2. 校验场地状态为 active
  3. 返回场地信息，未找到返回 404
说明：
  - 首页扫码/搜索场地码后调用此接口
  - 成功后前端跳转至场地详情页
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
  3. 通过 Supabase Realtime 通知场地所有者
  4. 返回预约信息

POST /api/bookings/cancel
请求：{ booking_id }
逻辑：
  1. 校验预约属于当前用户且状态为 pending/approved
  2. 更新 status = cancelled
```

#### 场地管理

```
POST /api/venues/create
请求：{ name, address, description, contact_phone, business_start, business_end, slot_duration }
响应：{ success: true, venue: { id, venue_code, name, ... } }
逻辑：
  1. 校验当前用户已登录
  2. 自动生成 6 位 venue_code（大写字母+数字，确保唯一）
  3. 插入 venues 表，creator_id 为当前用户
  4. 返回场地信息（含 venue_code）

POST /api/venues/update
请求：{ venue_id, name?, address?, description?, contact_phone?, business_start?, business_end?, slot_duration?, venue_code? }
响应：{ success: true, venue }
逻辑：
  1. 校验当前用户是该场地创建者（creator_id）
  2. 更新 venues 表
  3. 如修改 venue_code，需校验唯一性

GET /api/venues/my-venues
响应：{ success: true, venues: [...] }
逻辑：
  1. 查询当前用户创建的所有场地
```

#### 资源（房间号）管理

```
POST /api/resources/create
请求：{ venue_id, name, type, capacity, description?, price? }
响应：{ success: true, resource }
逻辑：
  1. 校验当前用户是该场地创建者
  2. 插入 resources 记录
  3. 返回资源信息

POST /api/resources/update
请求：{ resource_id, name?, type?, capacity?, status?, description?, price? }
响应：{ success: true, resource }
逻辑：
  1. 校验当前用户是该资源所属场地创建者
  2. 更新 resources 记录

POST /api/resources/delete
请求：{ resource_id }
响应：{ success: true }
逻辑：
  1. 校验当前用户是该资源所属场地创建者
  2. 校验该资源无进行中的预约
  3. 删除资源（CASCADE 删除关联时段）
```

#### 时段管理

```
GET /api/time-slots/list?resource_id=
响应：{ success: true, time_slots: [{ id, weekday, start_time, end_time, is_available }] }
逻辑：
  1. 校验当前用户是该资源所属场地创建者
  2. 查询 resource_time_slots 表

POST /api/time-slots/save
请求：{ resource_id, slots: [{ weekday, start_time, end_time, is_available }] }
响应：{ success: true, time_slots: [...] }
逻辑：
  1. 校验当前用户是该资源所属场地创建者
  2. 先删除该资源的所有旧时段
  3. 批量插入新时段
  说明：批量保存简化前端操作，适合"一键生成营业时段"场景

POST /api/time-slots/toggle
请求：{ slot_id, is_available }
响应：{ success: true }
逻辑：
  1. 校验当前用户是该时段所属资源对应场地创建者
  2. 更新 is_available 字段
```

#### 预约审核

```
GET /api/bookings/pending-list?venue_id=
响应：{ bookings: [...] }
逻辑：
  1. 校验当前用户是该场地创建者
  2. 返回该场地待审核预约列表

POST /api/bookings/approve
请求：{ booking_id }
逻辑：
  1. 校验当前用户是该预约所属场地创建者
  2. 更新 status = approved, reviewed_by, reviewed_at
  3. 发送微信订阅消息通知预约者

POST /api/bookings/reject
请求：{ booking_id, reject_reason }
逻辑：
  1. 校验当前用户是该预约所属场地创建者
  2. 更新 status = rejected, reject_reason, reviewed_by, reviewed_at
  3. 发送微信订阅消息通知预约者
```

### 4.3 认证中间件

```typescript
// api/_utils/auth.ts
import { verify } from 'jsonwebtoken';

export function authenticate(req: VercelRequest): { userId: string } {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new AuthError('未登录');

  const payload = verify(token, process.env.JWT_SECRET);
  return { userId: payload.sub };
}

export async function requireVenueOwner(req: VercelRequest, venueId: string): Promise<void> {
  const { userId } = authenticate(req);
  const { data: venue } = await supabase
    .from('venues')
    .select('creator_id')
    .eq('id', venueId)
    .single();

  if (!venue || venue.creator_id !== userId) {
    throw new AuthError('无权限：仅场地所有者可操作');
  }
}
```

> **说明**：不再使用 `requireAdmin`，改为 `requireVenueOwner` 按场地关系校验权限。

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
├── index/                    # 首页 - 扫码/搜索场地码入口（不展示场地列表）
├── venue-detail/             # 场地详情 - 资源列表
├── resource-detail/          # 资源详情 - 图片/描述/容量
├── booking/                  # 预约页面 - 选日期/时段/填信息
├── booking-result/           # 预约提交结果页
├── my-bookings/              # 我的预约列表
├── booking-detail/           # 预约详情
├── my-venues/                # 我的场地 - 场地所有者查看自己创建的场地
│   ├── venue-edit/           # 场地创建/编辑 + 场地码展示
│   ├── resource-manage/      # 房间号管理（添加/编辑/删除房间）
│   ├── time-slot-manage/     # 时段管理（配置各资源每周可用时段）
│   ├── pending-bookings/     # 待审核预约列表
│   ├── booking-calendar/     # 预约日历视图
│   └── stats/                # 数据统计
└── profile/                  # 个人中心
```

> **设计说明**：不再区分"用户端"和"管理后台"，所有页面统一组织。`my-venues/` 下的页面仅对场地所有者可见（前端根据"是否创建了场地"动态展示入口），但任何用户都可以创建场地后进入这些页面。

### 5.3 核心页面说明

#### 首页（扫码/搜索入口）

> **关键变更**：首页不再展示场地列表，用户必须通过扫码或搜索场地码进入场地。

- 顶部：场地码搜索框，用户输入场地码后点击搜索
- 中部：扫码入口按钮，调用 `wx.scanCode` 扫描场地二维码
- 底部：最近访问的场地卡片（本地缓存，可选功能，提升体验）
- 搜索/扫码成功后跳转至场地详情页

```
┌─────────────────────────────────┐
│         🏢 预约小程序            │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🔍 输入场地码搜索        │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │    📷  扫描场地二维码     │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  ─── 最近使用 ───               │
│  ┌──────┐  ┌──────┐            │
│  │场地A  │  │场地B  │            │
│  └──────┘  └──────┘            │
└─────────────────────────────────┘
```

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

#### 我的场地（场地所有者视角）
- 展示当前用户创建的所有场地
- 无场地时显示"创建场地"引导
- 有场地时展示场地卡片，点击进入场地管理

#### 场地创建/编辑
- 首次进入无场地时，显示"创建场地"引导
- 表单字段：场地名称、地址、联系电话、介绍、营业时间、时段时长
- 创建成功后展示场地码 + 二维码（可保存/分享）
- 已有场地时支持编辑，可自定义修改场地码

#### 房间号管理
- 列表展示当前场地的所有房间/桌号
- 添加房间：弹出表单，填写房间名（如 A01、A02）、类型、容量等
- 编辑房间：点击列表项进入编辑
- 删除房间：滑动删除，校验无进行中预约
- 状态切换：启用/停用房间

#### 时段管理
- 选择一个资源（房间）→ 展示该资源一周7天的时段配置
- 每天可配置多个时段（如 09:00-11:00, 11:00-13:00, ...）
- 一键"按营业时间自动生成"时段
- 支持单个时段的开/关切换
- 保存时批量提交

```
┌─────────────────────────────┐
│  选择房间：[A01 豪华包间 ▾]   │
├─────────────────────────────┤
│  ┌─ 周一 ─────────────────┐ │
│  │ 09:00-11:00  [✓ 开放]   │ │
│  │ 11:00-13:00  [✓ 开放]   │ │
│  │ 13:00-15:00  [✗ 关闭]   │ │
│  │ 15:00-17:00  [✓ 开放]   │ │
│  └─────────────────────────┘ │
│  ┌─ 周二 ─────────────────┐ │
│  │ ...                     │ │
│  └─────────────────────────┘ │
│                             │
│  [一键生成营业时段]           │
│  [保存]                     │
└─────────────────────────────┘
```

#### 待审核预约
- 新预约实时提醒（Supabase Realtime）
- 列表展示待审核预约
- 滑动操作：通过 / 拒绝（弹出输入拒绝原因）

#### 预约日历
- 日历视图，每天显示各资源的预约情况
- 不同状态用不同颜色标记
- 点击可查看详情

### 5.4 关键交互流程

#### 扫码进入场地

```
1. 用户点击"扫描场地二维码"
2. 调用 wx.scanCode() 扫码
3. 解析二维码内容（格式：booking://venue?code=QT8A2F）
4. 调用 /api/venues/search?code=QT8A2F
5. 成功 → 跳转场地详情页 → 选择资源 → 预约
6. 失败 → 提示"场地不存在"
```

#### 搜索场地码进入场地

```
1. 用户在搜索框输入场地码
2. 点击搜索按钮
3. 调用 /api/venues/search?code=XXXXXX
4. 成功 → 跳转场地详情页 → 选择资源 → 预约
5. 失败 → 提示"未找到该场地"
```

#### 预约页面交互

```
1. 用户选择日期 → 请求 /api/bookings/available-slots
2. 渲染时段列表，已占用时段置灰不可选
3. 用户选择时段 → 填写信息 → 点击提交
4. 调用 /api/bookings/create
5. 成功 → 跳转预约结果页（提示"已提交，等待审核"）
6. 失败（冲突）→ 提示"该时段已被预约，请重新选择"
```

#### 创建场地

```
1. 用户进入"我的场地"页面
2. 点击"创建场地"
3. 填写场地名称、地址、联系电话、营业时间等
4. 点击"创建场地"
5. 调用 /api/venues/create
6. 成功 → 显示场地码 + 二维码（可保存/分享）
7. 场地所有者将二维码分享给他人或打印张贴在线下场地
```

#### 添加房间号

```
1. 场地所有者进入房间号管理页
2. 点击"添加房间"
3. 填写房间名（如 A01）、类型、容量等
4. 调用 /api/resources/create
5. 成功 → 刷新房间列表
```

#### 管理时段

```
1. 场地所有者进入时段管理页
2. 选择一个房间
3. 可一键"按营业时间自动生成"时段，或手动调整
4. 切换单个时段的开/关状态
5. 点击"保存"
6. 调用 /api/time-slots/save（批量保存）
7. 成功 → 提示"时段已保存"
```

---

## 六、场地码与二维码方案

### 6.1 场地码设计

| 属性 | 说明 |
|------|------|
| 格式 | 6 位大写字母 + 数字组合（如 `QT8A2F`） |
| 生成时机 | 创建场地时自动生成 |
| 唯一性 | 数据库 `UNIQUE` 约束保证 |
| 可修改 | 场地所有者可在场地设置中自定义修改 |
| 用途 | 扫码/搜索的入口标识 |

### 6.2 二维码方案

| 方案 | 优点 | 缺点 | 推荐 |
|------|------|------|------|
| **前端生成（weapp-qrcode）** | 无需后端接口，离线可用，生成快 | 需引入第三方库 | ✅ 推荐 |
| 后端生成 + Storage | 统一管理，可追踪 | 需新增 API + Storage，增加复杂度 | 后期可选 |

**推荐方案**：使用 `weapp-qrcode` 库在小程序端直接生成二维码图片。

- 二维码内容格式：`booking://venue?code=QT8A2F`
- 生成位置：场地所有者场地设置页
- 场地所有者可长按保存二维码图片，打印张贴在线下场地
- 用户扫码后小程序解析内容，提取场地码，调用搜索接口

### 6.3 扫码解析流程

```
用户扫码 → wx.scanCode() 获取内容
  → 解析 booking://venue?code=QT8A2F
  → 提取 code=QT8A2F
  → 调用 /api/venues/search?code=QT8A2F
  → 成功 → 跳转场地详情页
  → 失败 → 提示"场地不存在或已停用"
```

### 6.4 最近访问记录

用户成功进入场地后，将场地信息缓存到本地（`wx.setStorageSync`），在首页"最近使用"区域展示：

```javascript
// 缓存结构
recentVenues: [
  { id, name, venue_code, visited_at }
]
// 最多保留 5 条，按访问时间倒序
```

---

## 七、认证流程

### 7.1 微信登录 + Supabase Auth 集成

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

### 7.2 实现步骤

1. 小程序端调用 `wx.login()` 获取 `code`
2. 将 `code` 发送到 `/api/auth/login`
3. 后端用 `code` 调用微信 `code2Session` 接口获取 `openid`
4. 在 Supabase `users` 表中查找或创建用户
5. 签发自定义 JWT（包含 `sub=userId`）
6. 返回 token 给小程序，后续请求携带 `Authorization: Bearer <token>`

### 7.3 权限模型

- 不设全局角色字段，所有用户权限平等
- 权限由"场地所有者"关系决定：通过 `venues.creator_id` 判断
- API 层通过 `requireVenueOwner()` 中间件校验场地操作权限
- 用户 A 既是自己场地的"管理者"，也是他人场地的"预约者"，两种身份自然并存

---

## 八、预约状态机

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
- pending  → approved   : 场地所有者审核通过
- pending  → rejected   : 场地所有者审核拒绝
- pending  → cancelled  : 用户主动取消
- pending  → expired    : 审核超时自动取消（可选）
- approved → cancelled  : 用户取消（需在规定时间内）
- approved → completed  : 预约时间到期自动完成（可选）
```

---

## 九、消息通知方案

### 9.1 微信订阅消息

| 通知场景 | 模板名称 | 接收人 | 触发时机 |
|----------|----------|--------|----------|
| 新预约提醒 | 预约通知 | 场地所有者 | 用户提交预约时 |
| 审核通过通知 | 审核结果通知 | 预约者 | 场地所有者审核通过时 |
| 审核拒绝通知 | 审核结果通知 | 预约者 | 场地所有者审核拒绝时 |
| 预约取消通知 | 取消通知 | 场地所有者 | 用户取消预约时 |
| 预约提醒 | 预约提醒 | 预约者 | 预约时间前1小时（可选） |

### 9.2 Supabase Realtime（场地所有者实时通知）

```typescript
// 场地所有者端监听新预约
const subscription = supabase
  .channel('venue-new-booking')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'bookings',
    filter: `venue_id=eq.${venueId}`
  }, (payload) => {
    showNewBookingNotification(payload.new);
  })
  .subscribe();
```

---

## 十、环境变量配置

### 10.1 Vercel 环境变量

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

### 10.2 小程序端配置

```javascript
// config.js
module.exports = {
  apiBaseUrl: 'https://your-vercel-app.vercel.app/api',
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

---

## 十一、开发阶段规划

### Phase 1：MVP（核心流程跑通）

**目标：** 用户能创建场地/添加房间/管理时段，其他用户能扫码预约，场地所有者能审核
| 任务 | 说明 |
|------|------|
| Supabase 项目搭建 | 创建项目、建表（含 venue_code 字段）、配置 RLS |
| Vercel 项目搭建 | 初始化项目、配置环境变量 |
| 微信登录 | wx.login → 获取用户信息 |
| 创建场地 | 任何用户填写场地信息 → 自动生成场地码 → 展示二维码 |
| 添加房间号 | 场地所有者管理房间 CRUD（添加/编辑/删除/启停用） |
| 管理时段 | 场地所有者按资源配置每周各天时段，一键生成营业时段 |
| 首页扫码/搜索 | 扫描场地二维码或输入场地码进入场地 |
| 预约提交 | 选日期时段 → 填信息 → 提交 |
| 预约列表 | 我的预约 |
| 场地所有者审核 | 待审核列表 → 通过/拒绝 |
| 时段冲突校验 | 提交时校验 + 数据库唯一索引 |

### Phase 2：体验优化

| 任务 | 说明 |
|------|------|
| 微信订阅消息 | 审核结果推送给预约者 |
| Supabase Realtime | 场地所有者实时收到新预约 |
| 预约日历视图 | 场地所有者日历查看预约情况 |
| 取消预约 | 用户取消 + 通知场地所有者 |
| 审核超时自动取消 | 定时任务清理过期待审核预约 |
| 最近访问场地 | 首页展示用户最近访问的场地卡片 |
| 场地码自定义 | 场地所有者可修改场地码 |

### Phase 3：运营增强

| 任务 | 说明 |
|------|------|
| 数据统计 | 预约量、资源利用率、热门时段 |
| 黑名单 | 爽约用户限制预约 |
| 多所有者 | 支持一个场地多个所有者（协管） |
| 资源图片上传 | Supabase Storage 存储 |
| 场地设置完善 | 营业时间、时段规则高级配置 |

### Phase 4：商业扩展（可选）

| 任务 | 说明 |
|------|------|
| 在线支付 | 微信支付，预约需预付定金 |
| 会员体系 | 会员卡、积分、折扣 |
| 多门店 | 一个用户管理多个场地 |
| H5 版本 | uni-app 编译为 H5 |
| 分享裂变 | 生成分享海报、邀请有礼 |

---

## 十二、Supabase 免费额度评估

| 资源 | 免费额度 | MVP 是否够用 |
|------|----------|-------------|
| 数据库 | 500MB | ✅ 绰绰有余 |
| Storage | 1GB | ✅ 图片量不大够用 |
| Auth | 50,000 MAU | ✅ 远超需求 |
| Realtime | 200 并发连接 | ✅ 场地所有者端够用 |
| Bandwidth | 5GB/月 | ✅ 够用 |

> Vercel 免费额度：100GB 带宽/月，Serverless Function 10秒超时，100次/天部署。MVP 阶段完全够用。

---

## 十三、风险与应对

| 风险 | 应对方案 |
|------|----------|
| 并发预约冲突 | 数据库唯一索引兜底 + 应用层先查后插 |
| Serverless 冷启动延迟 | Vercel 函数保持精简，冷启动通常 < 1s |
| 微信订阅消息需用户主动触发订阅 | 在预约提交成功页引导用户勾选订阅 |
| Supabase Realtime 连接数限制 | MVP 阶段场地所有者少，不会超限；后期可升级 |
| 审核超时占用资源 | 设置定时清理任务（Vercel Cron Jobs） |
| 场地所有者不活跃导致预约无人审核 | 审核超时自动取消 + 通知提醒所有者 |
