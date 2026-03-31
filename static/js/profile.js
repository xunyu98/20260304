// 个人信息页面 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 加载用户信息
    async function loadProfile() {
        try {
            const response = await fetch('/api/user-info');
            const data = await response.json();

            if (data.success) {
                // 更新页面信息
                document.getElementById('profileUsername').textContent = data.username;
                document.getElementById('profileEmail').textContent = data.email || '未设置';
                
                // 格式化日期时间
                const formatDate = (isoString) => {
                    if (!isoString) return '从未登录';
                    const date = new Date(isoString);
                    return date.toLocaleString('zh-CN');
                };
                
                document.getElementById('profileCreatedAt').textContent = formatDate(data.created_at);
                document.getElementById('profileLastLogin').textContent = formatDate(data.last_login);
                
                // 设置角色显示
                const roleText = data.role === 'admin' ? '管理员' : '普通用户';
                const roleClass = data.role === 'admin' ? 'role-admin' : 'role-user';
                
                document.getElementById('profileRole').textContent = roleText;
                document.getElementById('profileRoleDetail').textContent = roleText;
                document.getElementById('profileRole').className = `profile-role ${roleClass}`;
            } else {
                // 如果未登录，跳转到登录页
                showMessage('请先登录', 'error');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            showMessage('加载失败，请重试', 'error');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);
        }
    }

    // 处理登出
    logoutBtn.addEventListener('click', async function() {
        if (!confirm('确定要退出登录吗？')) {
            return;
        }

        try {
            const response = await fetch('/api/logout', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                // 清除本地存储
                localStorage.removeItem('rememberedUser');
                
                // 跳转到登录页
                window.location.href = '/login.html';
            } else {
                alert('退出登录失败，请重试');
            }
        } catch (error) {
            console.error('登出错误:', error);
            alert('网络错误，请稍后重试');
        }
    });

    // 显示消息提示
    function showMessage(message, type = 'success') {
        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;
        messageBox.style.position = 'fixed';
        messageBox.style.top = '20px';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translateX(-50%)';
        messageBox.style.zIndex = '1000';
        messageBox.style.background = type === 'error' ? '#e74c3c' : '#27ae60';
        messageBox.style.color = 'white';
        messageBox.style.padding = '15px 30px';
        messageBox.style.borderRadius = '10px';
        messageBox.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
        messageBox.style.animation = 'slideDown 0.3s ease-out';
        
        messageBox.innerHTML = `<span class="message-text">${message}</span>`;
        
        document.body.appendChild(messageBox);
        
        setTimeout(() => {
            messageBox.remove();
        }, 3000);
    }

    // 初始化加载用户信息
    loadProfile();
});
