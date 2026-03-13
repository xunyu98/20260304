from flask import Flask, render_template, request, jsonify, session, redirect, url_for, make_response
from functools import wraps
import hashlib
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # 生产环境请使用强随机密钥

# 用户数据存储文件
USER_DATA_FILE = 'users.json'

def load_users():
    """加载用户数据"""
    if not os.path.exists(USER_DATA_FILE):
        return {}
    with open(USER_DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_users(users):
    """保存用户数据"""
    with open(USER_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def hash_password(password):
    """密码哈希加密"""
    return hashlib.sha256(password.encode()).hexdigest()

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        return f(*args, **kwargs)
    return decorated_function

def no_cache(f):
    """禁止页面缓存装饰器 - 防止用户回退到登录页"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        response = make_response(f(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    return decorated_function

@app.route('/')
def index():
    """首页"""
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login.html')
@no_cache
def login_page():
    """登录页面"""
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register.html')
@no_cache
def register_page():
    """注册页面"""
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('register.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    """API - 用户登录"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'})
    
    users = load_users()
    password_hash = hash_password(password)
    
    if username in users and users[username]['password'] == password_hash:
        session['user'] = username
        session['login_time'] = datetime.now().isoformat()
        
        # 更新最后登录时间
        users[username]['last_login'] = datetime.now().isoformat()
        save_users(users)
        
        return jsonify({
            'success': True, 
            'message': '登录成功',
            'user': username
        })
    else:
        return jsonify({'success': False, 'message': '用户名或密码错误'})

@app.route('/api/register', methods=['POST'])
def api_register():
    """API - 用户注册"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    
    # 验证输入
    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'})
    
    if len(username) < 3:
        return jsonify({'success': False, 'message': '用户名至少 3 个字符'})
    
    if len(password) < 6:
        return jsonify({'success': False, 'message': '密码至少 6 个字符'})
    
    if email and '@' not in email:
        return jsonify({'success': False, 'message': '请输入有效的邮箱地址'})
    
    users = load_users()
    
    if username in users:
        return jsonify({'success': False, 'message': '用户名已存在'})
    
    # 创建新用户
    users[username] = {
        'password': hash_password(password),
        'email': email,
        'created_at': datetime.now().isoformat(),
        'last_login': None
    }
    save_users(users)
    
    return jsonify({
        'success': True, 
        'message': '注册成功，请登录'
    })

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    """API - 用户登出"""
    session.pop('user', None)
    return jsonify({'success': True, 'message': '已退出登录'})

@app.route('/dashboard')
@login_required
def dashboard():
    """仪表盘页面"""
    return render_template('dashboard.html')

@app.route('/api/user-info')
@login_required
def api_user_info():
    """API - 获取用户信息"""
    users = load_users()
    username = session.get('user')
    
    if username in users:
        user_data = users[username]
        return jsonify({
            'success': True,
            'username': username,
            'email': user_data.get('email', ''),
            'created_at': user_data.get('created_at', ''),
            'last_login': user_data.get('last_login', '')
        })
    return jsonify({'success': False, 'message': '用户不存在'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)
