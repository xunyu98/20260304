// 用户管理平台 - 管理员登录页面
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = loginBtn.querySelector('.btn-text');
    const loadingSpinner = loginBtn.querySelector('.loading-spinner');
    
    // 检查是否已记住账号
    const rememberedUser = localStorage.getItem('adminRememberedUser');
    if (rememberedUser) {
        document.getElementById('username').value = rememberedUser;
        document.getElementById('rememberMe').checked = true;
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // 验证输入
        if (!username || !password) {
            showMessage('请输入账号和密码', false);
            return;
        }
        
        // 禁用按钮
        setLoading(true);
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, rememberMe })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 记住账号
                if (rememberMe) {
                    localStorage.setItem('adminRememberedUser', username);
                } else {
                    localStorage.removeItem('adminRememberedUser');
                }
                
                showMessage('登录成功，正在跳转...', true);
                
                // 使用 replace 防止回退
                setTimeout(() => {
                    window.location.replace('/admin/users.html');
                }, 1000);
            } else {
                showMessage(data.message || '登录失败', false);
                setLoading(false);
            }
        } catch (error) {
            console.error('登录错误:', error);
            showMessage('网络错误，请稍后重试', false);
            setLoading(false);
        }
    });
    
    // 设置加载状态
    function setLoading(loading) {
        if (loading) {
            loginBtn.disabled = true;
            btnText.textContent = '登录中...';
            loadingSpinner.style.display = 'inline-block';
        } else {
            loginBtn.disabled = false;
            btnText.textContent = '登 录';
            loadingSpinner.style.display = 'none';
        }
    }
    
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
});
