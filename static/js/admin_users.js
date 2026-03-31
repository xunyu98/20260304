// 用户管理页面逻辑
let currentEditUser = null;
let currentResetUser = null;

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadAllUsers();
});

// 显示批量新增弹窗
function showBatchAddModal() {
    document.getElementById('batchAddModal').style.display = 'flex';
    document.getElementById('defaultPassword').value = '';
    document.getElementById('defaultRole').value = 'user';
    document.getElementById('userInputsContainer').innerHTML = '';
    // 默认添加 3 行输入
    for (let i = 0; i < 3; i++) {
        addUserInput();
    }
}

// 关闭批量新增弹窗
function closeBatchAddModal() {
    document.getElementById('batchAddModal').style.display = 'none';
}

// 添加一行用户输入
function addUserInput() {
    const container = document.getElementById('userInputsContainer');
    const index = container.children.length + 1;
    
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    row.innerHTML = `
        <input type="text" placeholder="用户名（必填）" class="batch-username" 
               style="flex: 1; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; outline: none;">
        <input type="email" placeholder="邮箱（可选）" class="batch-email" 
               style="flex: 1.5; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px; outline: none;">
        <button onclick="removeUserInput(this)" style="padding: 8px 12px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
            🗑️ 删除
        </button>
    `;
    container.appendChild(row);
}

// 删除一行用户输入
function removeUserInput(button) {
    const row = button.parentElement;
    const container = document.getElementById('userInputsContainer');
    if (container.children.length > 1) {
        row.remove();
    } else {
        showMessage('至少保留一行输入', false);
    }
}

// 批量新增用户
async function batchAddUsers() {
    const password = document.getElementById('defaultPassword').value.trim();
    const role = document.getElementById('defaultRole').value;
    
    // 验证密码
    if (!password || password.length < 6) {
        showMessage('密码至少 6 个字符', false);
        return;
    }
    
    // 收集所有用户输入
    const users = [];
    const usernameInputs = document.querySelectorAll('.batch-username');
    const emailInputs = document.querySelectorAll('.batch-email');
    
    for (let i = 0; i < usernameInputs.length; i++) {
        const username = usernameInputs[i].value.trim();
        const email = emailInputs[i].value.trim();
        
        if (username) {
            users.push({ username, email });
        }
    }
    
    if (users.length === 0) {
        showMessage('请至少填写一个用户名', false);
        return;
    }
    
    // 验证用户名格式
    for (let user of users) {
        if (user.username.length < 3) {
            showMessage(`用户名 "${user.username}" 至少 3 个字符`, false);
            return;
        }
        if (user.email && !user.email.includes('@')) {
            showMessage(`邮箱 "${user.email}" 格式不正确`, false);
            return;
        }
    }
    
    try {
        const response = await fetch('/api/admin/users/batch-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                users: users,
                password: password,
                role: role
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const successCount = data.results.filter(r => r.success).length;
            const failCount = data.results.filter(r => !r.success).length;
            
            let message = `成功添加 ${successCount} 个用户`;
            if (failCount > 0) {
                message += `，失败 ${failCount} 个`;
            }
            
            showMessage(message, true);
            closeBatchAddModal();
            loadAllUsers();
        } else {
            showMessage(data.message || '批量添加失败', false);
        }
    } catch (error) {
        console.error('批量添加失败:', error);
        showMessage('网络错误，请稍后重试', false);
    }
}

// 检查管理员权限（独立验证）
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/admin/check-auth', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            window.location.href = '/admin/login.html';
            return;
        }
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('currentUsername').textContent = data.username;
        } else {
            window.location.href = '/admin/login.html';
        }
    } catch (error) {
        console.error('权限验证失败:', error);
        window.location.href = '/admin/login.html';
    }
}

// 加载所有用户
async function loadAllUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        renderUserTable(data.users || []);
    } catch (error) {
        console.error('加载用户列表失败:', error);
        showMessage('加载失败', false);
    }
}

// 搜索用户
async function searchUsers() {
    const keyword = document.getElementById('searchInput').value.trim();
    const roleFilter = document.getElementById('roleFilter').value;
    
    try {
        const response = await fetch(`/api/admin/users/search?keyword=${encodeURIComponent(keyword)}&role=${roleFilter}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        renderUserTable(data.users || []);
    } catch (error) {
        console.error('搜索失败:', error);
        showMessage('搜索失败', false);
    }
}

// 渲染用户表格
function renderUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 40px; text-align: center; color: #999;">
                    <span style="font-size: 48px; display: block; margin-bottom: 10px;">📭</span>
                    暂无用户数据
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const roleClass = user.role === 'admin' ? 'background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: 500;' : 'background: #e0e0e0; color: #666; padding: 5px 12px; border-radius: 15px; font-size: 12px;';
        const roleName = user.role === 'admin' ? '👑 管理员' : '👤 普通用户';
        
        // 不能删除当前登录用户
        const deleteDisabled = user.username === document.getElementById('currentUsername').textContent ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
        
        return `
            <tr style="border-bottom: 1px solid #f0f0f0; transition: background 0.3s;">
                <td style="padding: 15px; color: #333; font-size: 14px;">${escapeHtml(user.username)}</td>
                <td style="padding: 15px; color: #666; font-size: 14px;">${escapeHtml(user.email || '-')}</td>
                <td style="padding: 15px;"><span style="${roleClass}">${roleName}</span></td>
                <td style="padding: 15px; color: #999; font-size: 13px;">${formatDate(user.created_at)}</td>
                <td style="padding: 15px; color: #999; font-size: 13px;">${user.last_login ? formatDate(user.last_login) : '-'}</td>
                <td style="padding: 15px; text-align: center;">
                    <button onclick="editRole('${escapeHtml(user.username)}')" style="padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                        ✏️ 修改角色
                    </button>
                    <button onclick="resetPassword('${escapeHtml(user.username)}')" style="padding: 6px 12px; background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                        🔑 重置密码
                    </button>
                    <button onclick="deleteUser('${escapeHtml(user.username)}')" ${deleteDisabled} style="padding: 6px 12px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        🗑️ 删除
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 修改用户角色
function editRole(username) {
    currentEditUser = username;
    document.getElementById('editRoleUsername').textContent = username;
    document.getElementById('editRoleModal').style.display = 'flex';
}

function closeEditRoleModal() {
    document.getElementById('editRoleModal').style.display = 'none';
    currentEditUser = null;
}

async function saveRole() {
    if (!currentEditUser) return;
    
    const newRole = document.getElementById('newRole').value;
    
    try {
        const response = await fetch('/api/admin/users/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentEditUser,
                role: newRole
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('角色修改成功', true);
            closeEditRoleModal();
            loadAllUsers();
        } else {
            showMessage(data.message || '操作失败', false);
        }
    } catch (error) {
        console.error('修改角色失败:', error);
        showMessage('操作失败', false);
    }
}

// 重置用户密码
function resetPassword(username) {
    currentResetUser = username;
    document.getElementById('resetPasswordUsername').textContent = username;
    document.getElementById('resetPasswordModal').style.display = 'flex';
}

function closeResetPasswordModal() {
    document.getElementById('resetPasswordModal').style.display = 'none';
    currentResetUser = null;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

async function saveNewPassword() {
    if (!currentResetUser) return;
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!newPassword || newPassword.length < 6) {
        showMessage('密码至少 6 个字符', false);
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('两次输入的密码不一致', false);
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentResetUser,
                password: newPassword
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('密码重置成功', true);
            closeResetPasswordModal();
        } else {
            showMessage(data.message || '操作失败', false);
        }
    } catch (error) {
        console.error('重置密码失败:', error);
        showMessage('操作失败', false);
    }
}

// 删除用户
async function deleteUser(username) {
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        if (data.success) {
            showMessage('用户已删除', true);
            loadAllUsers();
        } else {
            showMessage(data.message || '操作失败', false);
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        showMessage('操作失败', false);
    }
}

// 退出登录
document.getElementById('logoutBtn').addEventListener('click', async function() {
    if (!confirm('确定要退出用户管理平台吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/admin/login.html';
        }
    } catch (error) {
        console.error('退出失败:', error);
    }
});

// 显示消息提示
function showMessage(text, success) {
    const messageBox = document.getElementById('messageBox');
    const icon = messageBox.querySelector('.message-icon');
    const textSpan = messageBox.querySelector('.message-text');
    
    icon.textContent = success ? '✓' : '✗';
    icon.style.color = success ? '#27ae60' : '#e74c3c';
    icon.style.fontWeight = 'bold';
    
    textSpan.textContent = text;
    textSpan.style.color = '#333';
    
    messageBox.style.display = 'flex';
    
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, 3000);
}

// HTML 转义防止 XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
