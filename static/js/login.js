// 登录页面 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const messageBox = document.getElementById('messageBox');

    // 显示消息提示
    function showMessage(message, type = 'success') {
        messageBox.className = `message-box ${type}`;
        messageBox.querySelector('.message-text').textContent = message;
        messageBox.style.display = 'flex';
        
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, 3000);
    }

    // 验证输入
    function validateInput() {
        let isValid = true;
        
        // 清除之前的错误
        document.getElementById('usernameError').textContent = '';
        document.getElementById('passwordError').textContent = '';

        if (!usernameInput.value.trim()) {
            document.getElementById('usernameError').textContent = '请输入用户名';
            isValid = false;
        }

        if (!passwordInput.value) {
            document.getElementById('passwordError').textContent = '请输入密码';
            isValid = false;
        }

        return isValid;
    }

    // 处理表单提交
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateInput()) {
            return;
        }

        // 禁用按钮，显示加载状态
        loginBtn.disabled = true;
        loginBtn.querySelector('.btn-text').style.display = 'none';
        loginBtn.querySelector('.loading-spinner').style.display = 'inline-block';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('登录成功，正在跳转...', 'success');
                
                // 检查是否记住我
                const rememberMe = document.getElementById('rememberMe').checked;
                if (rememberMe) {
                    localStorage.setItem('rememberedUser', usernameInput.value.trim());
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                
                // 延迟跳转到仪表盘
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                showMessage(data.message || '登录失败', 'error');
                loginBtn.disabled = false;
                loginBtn.querySelector('.btn-text').style.display = 'inline-block';
                loginBtn.querySelector('.loading-spinner').style.display = 'none';
            }
        } catch (error) {
            console.error('登录错误:', error);
            showMessage('网络错误，请稍后重试', 'error');
            loginBtn.disabled = false;
            loginBtn.querySelector('.btn-text').style.display = 'inline-block';
            loginBtn.querySelector('.loading-spinner').style.display = 'none';
        }
    });

    // 检查是否有记住的用户名
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        usernameInput.value = rememberedUser;
        document.getElementById('rememberMe').checked = true;
    }

    // 实时验证输入
    usernameInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            document.getElementById('usernameError').textContent = '请输入用户名';
        } else {
            document.getElementById('usernameError').textContent = '';
        }
    });

    passwordInput.addEventListener('blur', function() {
        if (!this.value) {
            document.getElementById('passwordError').textContent = '请输入密码';
        } else {
            document.getElementById('passwordError').textContent = '';
        }
    });
});
