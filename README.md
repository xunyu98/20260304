# 平台登录系统

一个美观的现代化平台登录系统，包含前后端完整实现。

## 功能特性

- ✨ **用户注册**: 支持用户名、邮箱、密码注册
- 🔐 **用户登录**: SHA256 密码加密，会话管理
- 📊 **仪表盘**: 显示用户信息和系统状态
- 💾 **记住我**: 本地存储用户名，方便下次登录
- 🎨 **美观设计**: 现代化渐变 UI，响应式布局
- 📱 **响应式**: 支持 PC 和移动端

## 技术栈

### 后端
- Python 3.x
- Flask (Web 框架)
- hashlib (密码加密)

### 前端
- HTML5 + CSS3 + JavaScript
- 原生 JS (无框架依赖)
- 现代化渐变设计

## 安装步骤

### 1. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 2. 运行服务器

```bash
python app.py
```

服务器将在 `http://localhost:5000` 启动

### 3. 访问系统

在浏览器中打开：
- 登录页面：`http://localhost:5000/login.html`
- 注册页面：`http://localhost:5000/register.html`

## 使用说明

### 注册账号
1. 点击"立即注册"链接
2. 填写用户名（至少 3 个字符）
3. 填写邮箱（可选）
4. 设置密码（至少 6 个字符）
5. 确认密码
6. 同意服务条款
7. 点击"注册"按钮

### 登录系统
1. 输入用户名和密码
2. 可选择"记住我"功能
3. 点击"登录"按钮
4. 成功后自动跳转到仪表盘

### 退出登录
点击右上角的"退出登录"按钮

## 文件结构

```
.
├── app.py                  # Flask 后端主程序
├── requirements.txt        # Python 依赖
├── users.json             # 用户数据文件（运行时自动生成）
├── templates/             # HTML 模板
│   ├── login.html        # 登录页面
│   ├── register.html     # 注册页面
│   └── dashboard.html    # 仪表盘页面
└── static/               # 静态资源
    ├── css/
    │   └── style.css     # 全局样式
    └── js/
        ├── login.js      # 登录逻辑
        ├── register.js   # 注册逻辑
        └── dashboard.js  # 仪表盘逻辑
```

## API 接口

### POST /api/login
用户登录
- 请求体：`{ username, password }`
- 响应：`{ success, message, user }`

### POST /api/register
用户注册
- 请求体：`{ username, email, password }`
- 响应：`{ success, message }`

### POST /api/logout
退出登录
- 需要登录验证
- 响应：`{ success, message }`

### GET /api/user-info
获取用户信息
- 需要登录验证
- 响应：用户详细信息

## 安全特性

- ✅ 密码 SHA256 哈希加密存储
- ✅ 会话管理和验证
- ✅ 输入验证和错误处理
- ✅ 防止空提交
- ✅ 密码长度要求

## 注意事项

1. **生产环境部署**:
   - 修改 `app.secret_key` 为强随机密钥
   - 使用 HTTPS
   - 考虑使用数据库替代 JSON 文件存储
   - 添加 CSRF 保护

2. **数据安全**:
   - 当前版本使用 JSON 文件存储用户数据
   - 建议生产环境使用 MySQL/PostgreSQL 等数据库

3. **扩展功能**:
   - 密码找回
   - 邮箱验证
   - 双因素认证
   - 权限管理

## 开发者

如有问题或建议，欢迎联系！

## 许可证

MIT License
