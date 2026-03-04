// 注册页面 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    const registerBtn = document.getElementById('registerBtn');
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
        document.getElementById('emailError').textContent = '';
        document.getElementById('passwordError').textContent = '';
        document.getElementById('confirmPasswordError').textContent = '';

        // 验证用户名
        if (!usernameInput.value.trim()) {
            document.getElementById('usernameError').textContent = '请输入用户名';
            isValid = false;
        } else if (usernameInput.value.trim().length < 3) {
            document.getElementById('usernameError').textContent = '用户名至少 3 个字符';
            isValid = false;
        }

        // 验证邮箱（可选，但如果填写则必须有效）
        if (emailInput.value && !emailInput.value.includes('@')) {
            document.getElementById('emailError').textContent = '请输入有效的邮箱地址';
            isValid = false;
        }

        // 验证密码
        if (!passwordInput.value) {
            document.getElementById('passwordError').textContent = '请输入密码';
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            document.getElementById('passwordError').textContent = '密码至少 6 个字符';
            isValid = false;
        }

        // 验证确认密码
        if (!confirmPasswordInput.value) {
            document.getElementById('confirmPasswordError').textContent = '请再次输入密码';
            isValid = false;
        } else if (passwordInput.value !== confirmPasswordInput.value) {
            document.getElementById('confirmPasswordError').textContent = '两次输入的密码不一致';
            isValid = false;
        }

        // 验证服务条款
        if (!agreeTermsCheckbox.checked) {
            showMessage('请同意服务条款和隐私政策', 'error');
            isValid = false;
        }

        return isValid;
    }

    // 处理表单提交
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!validateInput()) {
            return;
        }

        // 禁用按钮，显示加载状态
        registerBtn.disabled = true;
        registerBtn.querySelector('.btn-text').style.display = 'none';
        registerBtn.querySelector('.loading-spinner').style.display = 'inline-block';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('注册成功！即将跳转到登录页面...', 'success');
                
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
            } else {
                showMessage(data.message || '注册失败', 'error');
                registerBtn.disabled = false;
                registerBtn.querySelector('.btn-text').style.display = 'inline-block';
                registerBtn.querySelector('.loading-spinner').style.display = 'none';
            }
        } catch (error) {
            console.error('注册错误:', error);
            showMessage('网络错误，请稍后重试', 'error');
            registerBtn.disabled = false;
            registerBtn.querySelector('.btn-text').style.display = 'inline-block';
            registerBtn.querySelector('.loading-spinner').style.display = 'none';
        }
    });

    // 实时验证
    usernameInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            document.getElementById('usernameError').textContent = '请输入用户名';
        } else if (this.value.trim().length < 3) {
            document.getElementById('usernameError').textContent = '用户名至少 3 个字符';
        } else {
            document.getElementById('usernameError').textContent = '';
        }
    });

    emailInput.addEventListener('blur', function() {
        if (this.value && !this.value.includes('@')) {
            document.getElementById('emailError').textContent = '请输入有效的邮箱地址';
        } else {
            document.getElementById('emailError').textContent = '';
        }
    });

    passwordInput.addEventListener('input', function() {
        if (this.value.length > 0 && this.value.length < 6) {
            document.getElementById('passwordError').textContent = '密码至少 6 个字符';
        } else {
            document.getElementById('passwordError').textContent = '';
        }
        
        // 如果确认密码已输入，重新验证
        if (confirmPasswordInput.value && this.value !== confirmPasswordInput.value) {
            document.getElementById('confirmPasswordError').textContent = '两次输入的密码不一致';
        }
    });

    confirmPasswordInput.addEventListener('input', function() {
        if (this.value && this.value !== passwordInput.value) {
            document.getElementById('confirmPasswordError').textContent = '两次输入的密码不一致';
        } else {
            document.getElementById('confirmPasswordError').textContent = '';
        }
    });
});
