#!/bin/bash

echo "🚀 启动平台登录系统..."
echo ""

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "⚠️  虚拟环境不存在，正在创建..."
    python3 -m venv venv
    echo "✅ 虚拟环境创建成功"
fi

# 激活虚拟环境
source venv/bin/activate

# 检查依赖
echo "📦 检查依赖..."
pip install -q -r requirements.txt

echo ""
echo "✅ 准备就绪！"
echo ""
echo "🌐 访问地址："
echo "   登录页面：http://localhost:8080/login.html"
echo "   注册页面：http://localhost:8080/register.html"
echo ""
echo "📝 测试账号："
echo "   用户名：admin"
echo "   密码：admin"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

# 启动服务器
python app.py
