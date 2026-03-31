from flask import Flask, render_template, request, jsonify, session, redirect, url_for, make_response
from functools import wraps
import hashlib
import pymysql
from dbutils.pooled_db import PooledDB
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # 生产环境请使用强随机密钥

# 数据库配置 - 请根据实际情况修改
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', '100.103.17.97'),
    'port': int(os.environ.get('DB_PORT', 3306)),
    'user': os.environ.get('DB_USER', 'yyh'),
    'password': os.environ.get('DB_PASSWORD', 'Yyh981107!'),
    'database': os.environ.get('DB_NAME', 'user_db'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# 创建数据库连接池
db_pool = None

def init_db_pool():
    """初始化数据库连接池"""
    global db_pool
    try:
        db_pool = PooledDB(
            creator=pymysql,
            maxconnections=10,          # 最大连接数
            mincached=2,                # 初始化时创建的空闲连接数
            maxcached=5,                # 空闲连接数最大值
            maxshared=5,                # 共享连接数（用于线程共享）
            blocking=True,              # 连接池满时是否阻塞
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset=DB_CONFIG['charset'],
            cursorclass=DB_CONFIG['cursorclass']
        )
        # print("✓ 数据库连接池初始化成功")
    except Exception as e:
        print(f"✗ 数据库连接池初始化失败：{e}")
        raise

def init_database():
    """初始化数据库表结构"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 创建 users 表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100),
                password VARCHAR(64) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                INDEX idx_username (username),
                INDEX idx_email (email),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ''')
        
        # 检查是否存在 admin 用户
        cursor.execute('SELECT COUNT(*) as count FROM users WHERE username = %s AND role = %s', 
                      ('admin', 'admin'))
        result = cursor.fetchone()
        
        if result['count'] == 0:
            # 创建默认管理员账号
            admin_password = hash_password('admin123')
            cursor.execute('''
                INSERT INTO users (username, email, password, role, created_at)
                VALUES (%s, %s, %s, %s, %s)
            ''', ('admin', 'admin@system.com', admin_password, 'admin', datetime.now()))
            conn.commit()
            # print("✓ 已创建默认管理员账号：admin / admin123")
        
        cursor.close()
        conn.close()
        # print("✓ 数据库表结构初始化成功")
        
    except Exception as e:
        print(f"✗ 数据库初始化失败：{e}")
        raise

def get_db_connection():
    """获取数据库连接"""
    if db_pool is None:
        init_db_pool()
    return db_pool.connection()

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

def admin_required(f):
    """管理员权限验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'success': False, 'message': '请先登录'}), 401
        
        users = load_users()
        username = session.get('user')
        
        if username not in users or users[username].get('role') != 'admin':
            return jsonify({'success': False, 'message': '需要管理员权限'}), 403
        
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
    
    user = get_user_by_username(username)
    password_hash = hash_password(password)
    
    if user and user['password'] == password_hash:
        session['user'] = username
        session['login_time'] = datetime.now().isoformat()
        
        # 更新最后登录时间
        update_last_login(username)
        
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
    
    # 创建新用户
    success = create_user(username, password, email)
    
    if success:
        return jsonify({
            'success': True, 
            'message': '注册成功，请登录'
        })
    else:
        return jsonify({'success': False, 'message': '用户名已存在'})

@app.route('/api/logout', methods=['POST'])
@login_required
def api_logout():
    """API - 用户登出（原平台）"""
    session.pop('user', None)
    return jsonify({'success': True, 'message': '已退出登录'})

@app.route('/api/admin/logout', methods=['POST'])
def api_admin_logout():
    """API - 管理员登出（用户管理平台专用）"""
    session.pop('admin_user', None)
    return jsonify({'success': True, 'message': '已退出登录'})

@app.route('/dashboard')
@login_required
def dashboard():
    """仪表盘页面"""
    return render_template('dashboard.html')

@app.route('/profile.html')
@login_required
def profile_page():
    """个人信息页面"""
    return render_template('profile.html')

@app.route('/api/user-info')
@login_required
def api_user_info():
    """API - 获取用户信息"""
    username = session.get('user')
    user = get_user_by_username(username)
    
    if user:
        return jsonify({
            'success': True,
            'username': user['username'],
            'email': user.get('email', ''),
            'created_at': user.get('created_at', '').isoformat() if user.get('created_at') else '',
            'last_login': user.get('last_login', '').isoformat() if user.get('last_login') else '',
            'role': user.get('role', 'user')
        })
    return jsonify({'success': False, 'message': '用户不存在'}), 404

@app.route('/api/check-admin')
@login_required
def api_check_admin():
    """API - 检查是否为管理员（原平台使用）"""
    username = session.get('user')
    user = get_user_by_username(username)
    
    if user and user.get('role') == 'admin':
        return jsonify({
            'success': True,
            'username': username
        })
    return jsonify({'success': False, 'message': '需要管理员权限'}), 403

@app.route('/api/admin/check-auth')
def api_admin_check_auth():
    """API - 检查管理员登录状态（用户管理平台专用）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    return jsonify({
        'success': True,
        'username': username
    })

@app.route('/admin/login.html')
@no_cache
def admin_login_page():
    """管理员登录页面"""
    if 'admin_user' in session:
        return redirect(url_for('admin_users_page'))
    return render_template('admin_login.html')

@app.route('/api/admin/login', methods=['POST'])
def api_admin_login():
    """API - 管理员登录（独立于普通用户登录）"""
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'success': False, 'message': '账号和密码不能为空'})
    
    user = get_user_by_username(username)
    password_hash = hash_password(password)
    
    # 验证是否为管理员
    if user and user['password'] == password_hash:
        if user.get('role') != 'admin':
            return jsonify({'success': False, 'message': '该账号不是管理员，无权访问用户管理平台'})
        
        # 设置管理员会话（独立于普通用户会话）
        session['admin_user'] = username
        session['admin_login_time'] = datetime.now().isoformat()
        

        update_last_login(username)
        
        return jsonify({
            'success': True, 
            'message': '登录成功',
            'user': username
        })
    else:
        return jsonify({'success': False, 'message': '账号或密码错误'})

@app.route('/admin/users.html')
@no_cache
def admin_users_page():
    """用户管理后台页面（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return redirect(url_for('admin_login_page'))
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return redirect(url_for('admin_login_page'))
    
    return render_template('admin_users.html')

@app.route('/api/admin/users')
def api_get_all_users():
    """API - 获取所有用户列表（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    users = get_all_users()
    return jsonify({
        'success': True,
        'users': users
    })

@app.route('/api/admin/users/search')
def api_search_users():
    """API - 搜索用户（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    keyword = request.args.get('keyword', '').strip().lower()
    role_filter = request.args.get('role', '').strip()
    
    users = search_users(keyword, role_filter)
    return jsonify({
        'success': True,
        'users': users
    })

@app.route('/api/admin/users/role', methods=['POST'])
def api_update_user_role():
    """API - 修改用户角色（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    data = request.get_json()
    target_username = data.get('username', '').strip()
    new_role = data.get('role', 'user').strip()
    
    if not target_username:
        return jsonify({'success': False, 'message': '用户名不能为空'})
    
    if new_role not in ['user', 'admin']:
        return jsonify({'success': False, 'message': '无效的角色类型'})
    
    target_user = get_user_by_username(target_username)
    if not target_user:
        return jsonify({'success': False, 'message': '用户不存在'})
    
    # 不能修改自己的角色
    if target_username == username:
        return jsonify({'success': False, 'message': '不能修改自己的角色'})
    
    success = update_user_role(target_username, new_role)
    if success:
        return jsonify({
            'success': True,
            'message': f'用户 {target_username} 的角色已更新为 {new_role}'
        })
    else:
        return jsonify({'success': False, 'message': '更新失败'}), 500

@app.route('/api/admin/users/reset-password', methods=['POST'])
def api_reset_user_password():
    """API - 重置用户密码（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    data = request.get_json()
    target_username = data.get('username', '').strip()
    new_password = data.get('password', '').strip()
    
    if not target_username or not new_password:
        return jsonify({'success': False, 'message': '用户名和新密码不能为空'})
    
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': '密码至少 6 个字符'})
    
    target_user = get_user_by_username(target_username)
    if not target_user:
        return jsonify({'success': False, 'message': '用户不存在'})
    
    # 不能重置自己的密码
    if target_username == username:
        return jsonify({'success': False, 'message': '不能重置自己的密码，请在个人中心修改'})
    
    success = reset_user_password(target_username, new_password)
    if success:
        return jsonify({
            'success': True,
            'message': f'用户 {target_username} 的密码已重置'
        })
    else:
        return jsonify({'success': False, 'message': '重置失败'}), 500

@app.route('/api/admin/users/delete', methods=['POST'])
def api_delete_user():
    """API - 删除用户（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    data = request.get_json()
    target_username = data.get('username', '').strip()
    
    if not target_username:
        return jsonify({'success': False, 'message': '用户名不能为空'})
    
    target_user = get_user_by_username(target_username)
    if not target_user:
        return jsonify({'success': False, 'message': '用户不存在'})
    
    # 不能删除自己
    if target_username == username:
        return jsonify({'success': False, 'message': '不能删除自己的账号'})
    
    success = delete_user(target_username)
    if success:
        return jsonify({
            'success': True,
            'message': f'用户 {target_username} 已删除'
        })
    else:
        return jsonify({'success': False, 'message': '删除失败'}), 500

@app.route('/api/admin/users/batch-add', methods=['POST'])
def api_batch_add_users():
    """API - 批量新增用户（需要独立的管理员登录）"""
    if 'admin_user' not in session:
        return jsonify({'success': False, 'message': '请先登录'}), 401
    
    username = session.get('admin_user')
    user = get_user_by_username(username)
    
    # 验证是否仍为管理员
    if not user or user.get('role') != 'admin':
        session.pop('admin_user', None)
        return jsonify({'success': False, 'message': '权限已变更'}), 403
    
    data = request.get_json()
    users_to_add = data.get('users', [])
    password = data.get('password', '')
    role = data.get('role', 'user')
    
    if not users_to_add or len(users_to_add) == 0:
        return jsonify({'success': False, 'message': '用户列表不能为空'})
    
    if not password or len(password) < 6:
        return jsonify({'success': False, 'message': '密码至少 6 个字符'})
    
    if role not in ['user', 'admin']:
        return jsonify({'success': False, 'message': '无效的角色类型'})
    
    results = []
    success_count = 0
    fail_count = 0
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for user_data in users_to_add:
            target_username = user_data.get('username', '').strip()
            email = user_data.get('email', '').strip()
            
            result = {'username': target_username, 'success': False, 'message': ''}
            
            # 验证
            if not target_username:
                result['message'] = '用户名不能为空'
                results.append(result)
                fail_count += 1
                continue
            
            if len(target_username) < 3:
                result['message'] = '用户名至少 3 个字符'
                results.append(result)
                fail_count += 1
                continue
            
            if email and '@' not in email:
                result['message'] = '邮箱格式不正确'
                results.append(result)
                fail_count += 1
                continue
            
            # 检查是否已存在
            existing_user = get_user_by_username(target_username)
            if existing_user:
                result['message'] = '用户名已存在'
                results.append(result)
                fail_count += 1
                continue
            
            # 创建用户
            try:
                cursor.execute('''
                    INSERT INTO users (username, email, password, role, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (target_username, email, hash_password(password), role, datetime.now()))
                conn.commit()
                result['success'] = True
                result['message'] = '添加成功'
                success_count += 1
            except Exception as e:
                result['message'] = f'数据库错误：{str(e)}'
                fail_count += 1
            
            results.append(result)
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'成功添加 {success_count} 个用户，失败 {fail_count} 个',
            'results': results,
            'total': len(users_to_add),
            'success_count': success_count,
            'fail_count': fail_count
        })
        
    except Exception as e:
        print(f"批量添加用户失败：{e}")
        return jsonify({'success': False, 'message': f'批量添加失败：{str(e)}'}), 500

def load_users():
    """从数据库加载所有用户（已废弃，保留兼容性）"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users')
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # 转换为字典格式
        return {user['username']: dict(user) for user in users}
    except Exception as e:
        print(f"✗ 加载用户失败：{e}")
        return {}

def get_user_by_username(username):
    """根据用户名获取用户"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return dict(user) if user else None
    except Exception as e:
        print(f"✗ 获取用户失败：{e}")
        return None

def create_user(username, password, email=''):
    """创建新用户"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (username, email, password, role, created_at)
            VALUES (%s, %s, %s, %s, %s)
        ''', (username, email, hash_password(password), 'user', datetime.now()))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except pymysql.err.IntegrityError:
        # 用户名已存在
        return False
    except Exception as e:
        print(f"✗ 创建用户失败：{e}")
        return False

def update_user_role(username, new_role):
    """更新用户角色"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET role = %s WHERE username = %s', (new_role, username))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()
        return affected > 0
    except Exception as e:
        print(f"✗ 更新用户角色失败：{e}")
        return False

def reset_user_password(username, new_password):
    """重置用户密码"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET password = %s WHERE username = %s', 
                      (hash_password(new_password), username))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()
        return affected > 0
    except Exception as e:
        print(f"✗ 重置密码失败：{e}")
        return False

def delete_user(username):
    """删除用户"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE username = %s', (username,))
        conn.commit()
        affected = cursor.rowcount
        cursor.close()
        conn.close()
        return affected > 0
    except Exception as e:
        print(f"✗ 删除用户失败：{e}")
        return False

def update_last_login(username):
    """更新最后登录时间"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET last_login = %s WHERE username = %s', 
                      (datetime.now(), username))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"✗ 更新登录时间失败：{e}")
        return False

def get_all_users():
    """获取所有用户列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT username, email, role, created_at, last_login 
            FROM users 
            ORDER BY created_at DESC
        ''')
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(user) for user in users]
    except Exception as e:
        print(f"✗ 获取用户列表失败：{e}")
        return []

def search_users(keyword='', role_filter=''):
    """搜索用户"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 构建查询条件
        conditions = []
        params = []
        
        if keyword:
            conditions.append('(username LIKE %s OR email LIKE %s)')
            keyword_param = f'%{keyword.lower()}%'
            params.extend([keyword_param, keyword_param])
        
        if role_filter:
            conditions.append('role = %s')
            params.append(role_filter)
        
        where_clause = ' AND '.join(conditions) if conditions else '1=1'
        
        query = f'''
            SELECT username, email, role, created_at, last_login 
            FROM users 
            WHERE {where_clause}
            ORDER BY created_at DESC
        '''
        
        cursor.execute(query, params)
        users = cursor.fetchall()
        cursor.close()
        conn.close()
        return [dict(user) for user in users]
    except Exception as e:
        print(f"✗ 搜索用户失败：{e}")
        return []

def save_users(users):
    """保存用户数据"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users')
        for username, data in users.items():
            cursor.execute('''
                INSERT INTO users (username, email, password, role, created_at, last_login)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (username, data.get('email', ''), data['password'], data.get('role', 'user'), 
                  data.get('created_at', ''), data.get('last_login', '')))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"✗ 保存用户失败：{e}")
        return False

def ensure_admin_user():
    """确保存在默认管理员账号"""
    users = load_users()
    
    if 'admin' not in users:
        users['admin'] = {
            'password': hash_password('admin123'),
            'email': 'admin@system.com',
            'role': 'admin',
            'created_at': datetime.now().isoformat(),
            'last_login': None
        }
        save_users(users)
        print("✓ 已创建默认管理员账号：admin / admin123")

if __name__ == '__main__':
    # 初始化数据库连接池和表结构
    init_db_pool()
    init_database()
    app.run(debug=True, host='0.0.0.0', port=8080)
