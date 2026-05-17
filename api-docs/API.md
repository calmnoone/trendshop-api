# TrendShop 商城后台接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

---

## 统一响应格式

```json
{ "code": 200, "message": "操作成功", "data": {} }
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 状态码，与 HTTP 状态码一致 |
| message | string | 提示信息 |
| data | object/array | 响应数据 |

---

## 错误码

| code | 说明 |
|------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

---

## 一、认证模块

### POST /api/auth/register — 注册

> 认证：否

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名，3-20 位 |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码，6-32 位 |

请求示例：
```json
{ "username": "zhangsan", "email": "zhangsan@example.com", "password": "123456" }
```

响应：
```json
{ "code": 201, "message": "注册成功", "data": { "id": 2 } }
```

### POST /api/auth/login — 登录

> 认证：否

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

响应：
```json
{
  "code": 200, "message": "登录成功",
  "data": { "token": "eyJ...", "user": { "id": 1, "username": "admin", "role": "admin", ... } }
}
```

---

## 二、商品模块

### GET /api/products — 商品列表

> 认证：否

| 参数 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| page | number | 1 | 页码 |
| pageSize | number | 12 | 每页数量 |
| category | string | - | 分类筛选 |
| keyword | string | - | 搜索关键词 |
| sort | string | - | 排序：price-asc / price-desc / rating / sales |

响应：
```json
{
  "code": 200,
  "data": {
    "list": [{ "id": 1, "name": "经典纯棉T恤", "category": "男装", "price": 129, "originalPrice": 259, "rating": 4.8, "stock": 200, ... }],
    "pagination": { "page": 1, "pageSize": 12, "total": 12, "totalPages": 1 }
  }
}
```

### GET /api/products/categories — 商品分类列表

> 认证：否

响应：
```json
{ "code": 200, "data": ["男装", "女装", "鞋履", "包包", "配饰", "数码"] }
```

### GET /api/products/:id — 商品详情

> 认证：否

响应：
```json
{ "code": 200, "data": { "id": 1, "name": "经典纯棉T恤", "price": 129, "stock": 200, ... } }
```

---

## 三、购物车模块

> 全部需要认证

### GET /api/cart — 获取购物车

响应：
```json
{ "code": 200, "data": { "items": [...], "total": 258, "count": 2 } }
```

### POST /api/cart — 添加到购物车

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | number | 是 | 商品 ID |
| quantity | number | 否 | 数量，默认 1 |

### PUT /api/cart/:productId — 更新数量

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| quantity | number | 是 | 新数量，0 则移除 |

### DELETE /api/cart/:productId — 移除商品

### DELETE /api/cart — 清空购物车

---

## 四、心愿单模块

> 全部需要认证

### GET /api/wishlist — 获取心愿单

### POST /api/wishlist — 添加到心愿单

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | number | 是 | 商品 ID |

### DELETE /api/wishlist/:productId — 取消收藏

---

## 五、订单模块

> 全部需要认证

### POST /api/orders — 创建订单

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| items | array | 是 | `[{ "productId": 1, "quantity": 2 }]` |
| address | string | 否 | 收货地址 |
| note | string | 否 | 订单备注 |

下单后自动扣减库存并清空购物车。

### GET /api/orders — 我的订单列表

| 参数 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| page | number | 1 | 页码 |
| pageSize | number | 10 | 每页数量 |

### GET /api/orders/:id — 订单详情

---

## 六、用户管理模块（管理员）

### GET /api/users — 用户列表
### GET /api/users/me — 当前用户信息
### PUT /api/users/me — 修改个人信息
### GET /api/users/:id — 用户详情
### PUT /api/users/:id — 修改用户
### DELETE /api/users/:id — 删除用户

---

## 默认账号

| 用户名 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |

---

## 数据模型

### products

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 商品 ID |
| name | string | 商品名称 |
| category | string | 分类 |
| price | number | 售价 |
| originalPrice | number | 原价 |
| image | string | 图片标识 |
| badge | string | 标签文字 |
| badgeType | string | 标签类型：hot / new |
| rating | number | 评分 |
| reviews | number | 评论数 |
| stock | number | 库存 |
| desc | string | 商品描述 |

### orders

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 订单 ID（时间戳） |
| userId | number | 用户 ID |
| items | array | 订单商品列表 |
| total | number | 订单总额 |
| status | string | 状态：pending / shipped / completed |
| address | string | 收货地址 |
| note | string | 备注 |
| createdAt | string | 创建时间 |
