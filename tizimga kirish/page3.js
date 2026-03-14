// Check for backdrop-filter support
        function checkBackdropFilterSupport() {
            const hasBackdropFilter = CSS.supports('backdrop-filter', 'blur(1px)') || 
                                     CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
            
            if (!hasBackdropFilter) {
                const notice = document.getElementById('browserNotice');
                notice.style.display = 'block';
                
                // Hide notice after 5 seconds
                setTimeout(() => {
                    notice.style.display = 'none';
                }, 5000);
            }
        }

        // Form submission
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            // Simple validation
            if (!username || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            // In a real application, you would send this data to a server
            console.log('Login attempt:', { username, password, remember });
            
            // Show success message
            alert(`Welcome back, ${username}! Login successful.`);
            
            // Reset form
            document.getElementById('loginForm').reset();
        });

        // Social login buttons
        document.querySelectorAll('.social-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const platform = this.querySelector('i').className.split(' ')[1].split('-')[1];
                alert(`Sign in with ${platform.charAt(0).toUpperCase() + platform.slice(1)} would be triggered in a real application.`);
            });
        });

        // Forgot password link
        document.querySelector('.forgot-link').addEventListener('click', function(e) {
            e.preventDefault();
            alert('A password reset link would be sent to your email in a real application.');
        });

        // Register link
        document.querySelector('.register-link a').addEventListener('click', function(e) {
            e.preventDefault();
            alert('Registration form would open in a real application.');
        });

        // Check for backdrop-filter support on load
        document.addEventListener('DOMContentLoaded', checkBackdropFilterSupport);