function isLocalFileMode() {
    return window.location.protocol === 'file:';
}

function isLoginPage() {
    const path = window.location.pathname.toLowerCase();
    return path === '/' || path.endsWith('/index.html') || path.endsWith('\\index.html');
}

function getDashboardUrl() {
    return 'dashboard.html';
}

function getLoginUrl() {
    return isLocalFileMode() ? 'index.html' : '/';
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            // Simuler une authentification
            if (email === 'medajeanbaptiste188@gmail.com' && password === 'admin123') {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = getDashboardUrl();
            } else {
                errorMessage.textContent = 'Email ou mot de passe incorrect';
                errorMessage.style.display = 'block';
            }
        });
    }
});

// Vérifier si l'utilisateur est connecté
function checkAuth() {
    if (!localStorage.getItem('isLoggedIn') && !isLoginPage()) {
        window.location.href = getLoginUrl();
    }
}
