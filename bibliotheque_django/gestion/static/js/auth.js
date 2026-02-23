function isLocalFileMode() {
    return window.location.protocol === 'file:';
}

function isLoginPage() {
    const path = window.location.pathname.toLowerCase();
    return path.endsWith('/index.html') || path.endsWith('\\index.html');
}

function getApiRoot() {
    if (typeof API_BASE_URL !== 'undefined') {
        return API_BASE_URL.replace(/\/$/, '');
    }
    if (isLocalFileMode()) {
        return 'http://localhost:8000/api';
    }
    return `${window.location.origin}/api`;
}

function getLoginUrl() {
    return isLocalFileMode() ? 'accueil.html' : '/';
}

function toAppUrl(path) {
    if (isLocalFileMode()) {
        return path.replace(/^\//, '');
    }
    return path;
}

function getAuthState() {
    try {
        return JSON.parse(localStorage.getItem('authUser') || '{}');
    } catch (error) {
        return {};
    }
}

function saveAuthState(user) {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('authUser', JSON.stringify(user));
}

function clearAuthState() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authUser');
}

function showAuthMessage(message, type = 'error') {
    const errorMessage = document.getElementById('error-message');
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = type === 'success' ? '#1f8f45' : '';
}

function hideAuthMessage() {
    const errorMessage = document.getElementById('error-message');
    if (!errorMessage) return;
    errorMessage.style.display = 'none';
    errorMessage.style.color = '';
}

async function ensureCsrfForAuth() {
    const response = await fetch(`${getApiRoot()}/csrf/`, {
        method: 'GET',
        credentials: isLocalFileMode() ? 'include' : 'same-origin',
    });
    return response.ok;
}

async function loginWithApi(identifier, password, portal) {
    const accessCode = document.getElementById('biblio_access_code')?.value || '';
    await ensureCsrfForAuth();
    const response = await fetch(`${getApiRoot()}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: isLocalFileMode() ? 'include' : 'same-origin',
        body: JSON.stringify({ identifier, password, portal, access_code: accessCode }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.detail || 'Connexion impossible');
    }
    return payload;
}

async function registerWithApi(data) {
    await ensureCsrfForAuth();
    const response = await fetch(`${getApiRoot()}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: isLocalFileMode() ? 'include' : 'same-origin',
        body: JSON.stringify(data),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.detail || 'Inscription impossible');
    }
    return payload;
}

async function registerBibliothecaireWithApi(data) {
    await ensureCsrfForAuth();
    const response = await fetch(`${getApiRoot()}/auth/register-bibliothecaire/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: isLocalFileMode() ? 'include' : 'same-origin',
        body: JSON.stringify(data),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.detail || 'Création bibliothécaire impossible');
    }
    return payload;
}

async function logoutSession() {
    try {
        await ensureCsrfForAuth();
        await fetch(`${getApiRoot()}/auth/logout/`, {
            method: 'POST',
            credentials: isLocalFileMode() ? 'include' : 'same-origin',
        });
    } catch (error) {
        // no-op
    } finally {
        clearAuthState();
        window.location.href = getLoginUrl();
    }
}

function protectRoutesByRole() {
    if (isLoginPage()) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = getLoginUrl();
        return;
    }

    const auth = getAuthState();
    const role = auth.role || 'bibliothecaire';
    const path = window.location.pathname.toLowerCase();

    if (
        role === 'utilisateur' &&
        !path.endsWith('/espace-utilisateur.html') &&
        !path.endsWith('\\espace-utilisateur.html') &&
        !path.endsWith('/parametres-utilisateur.html') &&
        !path.endsWith('\\parametres-utilisateur.html')
    ) {
        window.location.href = toAppUrl('/espace-utilisateur.html');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    protectRoutesByRole();

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerBiblioForm = document.getElementById('registerBiblioForm');
    const authTitle = document.getElementById('authTitle');
    const userAuthActions = document.getElementById('userAuthActions');
    const biblioAuthActions = document.getElementById('biblioAuthActions');
    const biblioCodeGroup = document.getElementById('biblioCodeGroup');
    const biblioCodeInput = document.getElementById('biblio_access_code');

    const registerToggle = document.getElementById('showRegisterFormBtn');
    const showBiblioRegisterFormBtn = document.getElementById('showBiblioRegisterFormBtn');
    const showBiblioLoginFormBtn = document.getElementById('showBiblioLoginFormBtn');

    if (registerToggle && loginForm && registerForm) {
        registerToggle.addEventListener('click', function() {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            if (registerBiblioForm) registerBiblioForm.style.display = 'none';
            if (userAuthActions) userAuthActions.style.display = 'none';
            hideAuthMessage();
        });
    }

    if (showBiblioRegisterFormBtn && loginForm && registerBiblioForm) {
        showBiblioRegisterFormBtn.addEventListener('click', function() {
            loginForm.style.display = 'none';
            registerBiblioForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
            if (biblioAuthActions) biblioAuthActions.style.display = 'none';
            hideAuthMessage();
        });
    }

    if (showBiblioLoginFormBtn && loginForm && registerBiblioForm) {
        showBiblioLoginFormBtn.addEventListener('click', function() {
            registerBiblioForm.style.display = 'none';
            loginForm.style.display = 'block';
            showBiblioLoginFormBtn.style.display = 'none';
            if (biblioAuthActions) biblioAuthActions.style.display = 'flex';
            hideAuthMessage();
        });
    }

    const mode = new URLSearchParams(window.location.search).get('mode');
    const portal = mode === 'utilisateur' ? 'utilisateur' : 'bibliothecaire';

    if (mode === 'utilisateur' && loginForm && registerForm) {
        if (authTitle) authTitle.textContent = 'Espace utilisateur';
        if (userAuthActions) userAuthActions.style.display = 'flex';
        if (biblioAuthActions) biblioAuthActions.style.display = 'none';
        if (biblioCodeGroup) biblioCodeGroup.style.display = 'none';
        if (biblioCodeInput) biblioCodeInput.required = false;
        if (registerBiblioForm) registerBiblioForm.style.display = 'none';
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        hideAuthMessage();
    } else if (mode === 'bibliothecaire' && loginForm && registerForm) {
        if (authTitle) authTitle.textContent = 'Connexion bibliothécaire';
        if (userAuthActions) userAuthActions.style.display = 'none';
        if (biblioAuthActions) biblioAuthActions.style.display = 'flex';
        if (biblioCodeGroup) biblioCodeGroup.style.display = 'block';
        if (biblioCodeInput) biblioCodeInput.required = true;
        if (registerBiblioForm) registerBiblioForm.style.display = 'none';
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        hideAuthMessage();
    } else if (loginForm && registerForm) {
        if (userAuthActions) userAuthActions.style.display = 'none';
        if (biblioAuthActions) biblioAuthActions.style.display = 'none';
        if (biblioCodeGroup) biblioCodeGroup.style.display = 'none';
        if (biblioCodeInput) biblioCodeInput.required = false;
        if (registerBiblioForm) registerBiblioForm.style.display = 'none';
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        hideAuthMessage();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAuthMessage();

            const identifier = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const user = await loginWithApi(identifier, password, portal);
                saveAuthState(user);
                window.location.href = toAppUrl(user.redirect_url || '/dashboard.html');
            } catch (error) {
                showAuthMessage(error.message || 'Email ou mot de passe incorrect');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAuthMessage();

            const nom = document.getElementById('register_nom').value.trim();
            const email = document.getElementById('register_email').value.trim().toLowerCase();
            const password = document.getElementById('register_password').value;
            const passwordConfirm = document.getElementById('register_password_confirm').value;
            const telephone = document.getElementById('register_telephone').value.trim();
            const adresse = document.getElementById('register_adresse').value.trim();

            if (password !== passwordConfirm) {
                showAuthMessage('Les mots de passe ne correspondent pas.');
                return;
            }

            try {
                await registerWithApi({ nom, email, password, telephone, adresse, portal: 'utilisateur' });
                showAuthMessage('Compte créé avec succès.', 'success');
                registerForm.reset();
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                if (userAuthActions) userAuthActions.style.display = 'flex';
                const identifierInput = document.getElementById('email');
                if (identifierInput) identifierInput.value = email;
            } catch (error) {
                showAuthMessage(error.message || 'Inscription impossible');
            }
        });
    }

    if (registerBiblioForm) {
        registerBiblioForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideAuthMessage();

            const nom = document.getElementById('register_biblio_nom').value.trim();
            const email = document.getElementById('register_biblio_email').value.trim().toLowerCase();
            const password = document.getElementById('register_biblio_password').value;
            const passwordConfirm = document.getElementById('register_biblio_password_confirm').value;
            const access_code = document.getElementById('register_biblio_code').value;

            if (password !== passwordConfirm) {
                showAuthMessage('Les mots de passe ne correspondent pas.');
                return;
            }

            try {
                await registerBibliothecaireWithApi({ nom, email, password, access_code, portal: 'bibliothecaire' });
                showAuthMessage('Compte créé avec succès.', 'success');
                registerBiblioForm.reset();
                registerBiblioForm.style.display = 'none';
                loginForm.style.display = 'block';
                if (biblioAuthActions) biblioAuthActions.style.display = 'flex';
                const identifierInput = document.getElementById('email');
                if (identifierInput) identifierInput.value = email;
            } catch (error) {
                showAuthMessage(error.message || 'Création bibliothécaire impossible');
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logoutSession();
        });
    }
});
