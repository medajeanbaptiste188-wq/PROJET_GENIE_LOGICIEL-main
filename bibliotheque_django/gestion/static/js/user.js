const SIDEBAR_WIDTH_KEY_USER = 'bibliogest_sidebar_width_user';
const SIDEBAR_MIN_WIDTH_USER = 72;
const SIDEBAR_MAX_WIDTH_USER = 420;
const SIDEBAR_COMPACT_BREAKPOINT_USER = 140;

let userBookFilter = 'all';

function getAuthUser() {
    try {
        return JSON.parse(localStorage.getItem('authUser') || '{}');
    } catch (error) {
        return {};
    }
}

function resolveUserMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : `${window.location.protocol}//${window.location.host}/api`;
    const backendOrigin = apiBase.replace(/\/api\/?$/, '');
    if (url.startsWith('/')) return `${backendOrigin}${url}`;
    return `${backendOrigin}/${url}`;
}

function formatUserDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
}

function statutLabel(statut) {
    if (statut === 'en_cours') return 'En cours';
    if (statut === 'retard') return 'En retard';
    if (statut === 'retourne') return 'Retourné';
    if (statut === 'perdu') return 'Perdu';
    return statut || '';
}

function statutClass(statut) {
    if (statut === 'en_cours') return 'status-active';
    if (statut === 'retard' || statut === 'perdu') return 'status-suspended';
    return 'status-borrowed';
}

function getDateInDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function showUserMessage(message, isError = false) {
    const node = document.getElementById('userActionMessage');
    if (!node) return;
    node.textContent = message;
    node.style.display = 'block';
    node.style.background = isError ? '#ffe2e2' : '#e7f9ee';
    node.style.color = isError ? '#8c1b1b' : '#0b6b37';
}

function clampSidebarWidthUser(width) {
    return Math.min(SIDEBAR_MAX_WIDTH_USER, Math.max(SIDEBAR_MIN_WIDTH_USER, width));
}

function applySidebarWidthUser(width) {
    const safeWidth = clampSidebarWidthUser(width);
    document.documentElement.style.setProperty('--sidebar-width', `${safeWidth}px`);
    if (safeWidth <= SIDEBAR_COMPACT_BREAKPOINT_USER) {
        document.body.classList.add('sidebar-compact');
    } else {
        document.body.classList.remove('sidebar-compact');
    }
    return safeWidth;
}

function initResizableSidebarUser() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !mainContent) return;

    if (window.innerWidth <= 768) {
        document.body.classList.remove('sidebar-compact');
        const existingResizer = document.getElementById('sidebarResizer');
        if (existingResizer) existingResizer.remove();
        return;
    }

    const savedWidth = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY_USER), 10);
    if (!Number.isNaN(savedWidth)) {
        applySidebarWidthUser(savedWidth);
    }

    let resizer = document.getElementById('sidebarResizer');
    if (!resizer) {
        resizer = document.createElement('div');
        resizer.id = 'sidebarResizer';
        resizer.className = 'sidebar-resizer';
        document.body.appendChild(resizer);
    }

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (event) => {
        const nextWidth = startWidth + (event.clientX - startX);
        applySidebarWidthUser(nextWidth);
    };

    const onMouseUp = () => {
        const currentWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').replace('px', '').trim();
        localStorage.setItem(SIDEBAR_WIDTH_KEY_USER, String(parseInt(currentWidth, 10)));
        document.body.classList.remove('resizing-sidebar');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.onmousedown = (event) => {
        event.preventDefault();
        startX = event.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        document.body.classList.add('resizing-sidebar');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
}

async function renderUserBooks(searchTerm = '') {
    const container = document.getElementById('userBooksContainer');
    if (!container) return;

    const livres = await getLivres();
    const filtered = livres.filter((livre) => {
        const matchSearch = livre.titre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchGenre = userBookFilter === 'all' || livre.genre === userBookFilter;
        return matchSearch && matchGenre;
    });

    container.innerHTML = filtered.map((livre) => {
        const coverUrl = resolveUserMediaUrl(livre.couverture);
        const coverHtml = coverUrl
            ? `<img src="${coverUrl}" alt="Couverture de ${livre.titre}" class="book-card-cover">`
            : `<div class="book-card-cover-placeholder">📖</div>`;
        const canBorrow = livre.disponible > 0;

        return `
            <div class="book-card">
                <div class="book-card-cover-wrapper">${coverHtml}</div>
                <div class="book-header">
                    <span class="book-title">📖 ${livre.titre}</span>
                    <span class="book-isbn">ISBN: ${livre.isbn}</span>
                </div>
                <span class="book-author">${livre.auteur}</span>
                <span class="book-editor">${livre.editeur}, ${livre.annee}</span>
                <span class="book-status ${canBorrow ? 'status-available' : 'status-borrowed'}">
                    Disponible: ${livre.disponible}/${livre.total}
                </span>
                <div class="book-actions">
                    <button ${canBorrow ? '' : 'disabled'} onclick="emprunterLivreUtilisateur(${livre.id})" class="btn-primary">
                        Emprunter
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function renderUserLoans() {
    const tbody = document.getElementById('userLoansTableBody');
    if (!tbody) return;

    const emprunts = await getEmprunts();
    tbody.innerHTML = emprunts.map((emprunt) => `
        <tr>
            <td>${emprunt.id}</td>
            <td>${emprunt.livre_titre}</td>
            <td>${formatUserDate(emprunt.date_emprunt)}</td>
            <td>${formatUserDate(emprunt.date_retour_prevue)}</td>
            <td>
                <span class="status-badge ${statutClass(emprunt.statut)}">${statutLabel(emprunt.statut)}</span>
            </td>
        </tr>
    `).join('');
}

async function emprunterLivreUtilisateur(livreId) {
    const payload = {
        livre: livreId,
        date_retour_prevue: getDateInDays(14),
        notes: 'Emprunt via espace utilisateur',
    };

    const result = await ajouterEmprunt(payload);
    if (!result) {
        showUserMessage("Impossible d'emprunter ce livre.", true);
        return;
    }

    showUserMessage('Livre emprunté avec succès.');
    await renderUserBooks(document.getElementById('searchUserBooks')?.value || '');
    await renderUserLoans();
}

function initUserFilters() {
    const filterButtons = document.querySelectorAll('.user-filter-btn');
    if (!filterButtons.length) return;

    filterButtons.forEach((button) => {
        button.addEventListener('click', async function() {
            filterButtons.forEach((b) => b.classList.remove('active'));
            this.classList.add('active');
            userBookFilter = this.dataset.filter || 'all';
            await renderUserBooks(document.getElementById('searchUserBooks')?.value || '');
        });
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    const auth = getAuthUser();
    if (auth.role && auth.role !== 'utilisateur') {
        window.location.href = 'dashboard.html';
        return;
    }

    const userNameNodes = document.querySelectorAll('#userName');
    userNameNodes.forEach((node) => {
        node.textContent = auth.nom || 'Utilisateur';
    });

    initResizableSidebarUser();
    window.addEventListener('resize', initResizableSidebarUser);
    initUserFilters();

    await renderUserBooks();
    await renderUserLoans();

    const search = document.getElementById('searchUserBooks');
    if (search) {
        search.addEventListener('input', async function() {
            await renderUserBooks(search.value);
        });
    }
});
