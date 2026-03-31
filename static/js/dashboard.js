// 仪表盘页面 JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    const logoutBtn = document.getElementById('logoutBtn');
    const currentUsername = document.getElementById('currentUsername');
    const userInfo = document.getElementById('userInfo');
    
    // 设置当前日期
    const currentDate = document.getElementById('currentDate');
    if(currentDate) {
        const now = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        currentDate.textContent = now.toLocaleDateString('zh-CN', options);
    }

    // 加载用户信息
    async function loadUserInfo() {
        try {
            const response = await fetch('/api/user-info');
            const data = await response.json();

            if (data.success) {
                currentUsername.textContent = data.username;
                
                // 显示用户资料链接
                showUserProfileLink(data.username);
                
                // 不再显示详细信息，只确保不报错（如果后续需要扩展可在此处添加简单信息）
                if(userInfo) {
                    userInfo.innerHTML = ''; 
                }
            } else {
                // 如果未登录，跳转到登录页
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
            window.location.href = '/login.html';
        }
    }

    // 处理登出
    if(logoutBtn) {
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
    }

    // 快捷操作按钮事件
    const actionButtons = document.querySelectorAll('.action-btn');
    if(actionButtons.length > 0) {
        actionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const actionName = this.querySelector('span:last-child').textContent;
                
                // 显示提示信息（实际项目中可以跳转到相应页面）
                showMessage(`${actionName}功能开发中...`, 'info');
            });
        });
    }

    // 显示消息提示
    function showMessage(message, type = 'success') {
        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;
        messageBox.style.position = 'fixed';
        messageBox.style.top = '20px';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translateX(-50%)';
        messageBox.style.zIndex = '1000';
        
        messageBox.innerHTML = `
            <span class="message-text">${message}</span>
        `;
        
        document.body.appendChild(messageBox);
        
        setTimeout(() => {
            messageBox.remove();
        }, 3000);
    }

    // 页面可见性检查（防止会话过期）
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('页面隐藏');
        } else {
            console.log('页面显示');
        }
    });

    // 初始化加载用户信息
    loadUserInfo();
});

// 显示用户资料链接
function showUserProfileLink(username) {
    const profileLink = document.getElementById('userProfileLink');
    if (profileLink) {
        profileLink.style.opacity = '1';
        profileLink.style.pointerEvents = 'auto';
    }
}
