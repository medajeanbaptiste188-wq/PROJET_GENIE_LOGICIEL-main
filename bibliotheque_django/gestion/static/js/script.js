function isLocalFileMode() {
    return window.location.protocol === 'file:';
}

function isLoginPage() {
    const path = window.location.pathname.toLowerCase();
    return path === '/' || path.endsWith('/index.html') || path.endsWith('\\index.html');
}

function getLoginUrl() {
    return isLocalFileMode() ? 'index.html' : '/';
}

function getSavedAppSettings() {
    try {
        return JSON.parse(localStorage.getItem('bibliogest_settings') || '{}');
    } catch (error) {
        return {};
    }
}

function isDashboardAutoRefreshEnabled() {
    const settings = getSavedAppSettings();
    return settings.dashboardAutoRefresh !== false;
}

function isHighlightLateEnabled() {
    const settings = getSavedAppSettings();
    return settings.highlightLate !== false;
}

function applyFeatureToggles() {
    if (isHighlightLateEnabled()) {
        document.body.classList.add('highlight-late');
    } else {
        document.body.classList.remove('highlight-late');
    }
}

function showTopCenterSuccess(message) {
    let node = document.getElementById('topCenterSuccessMessage');
    if (!node) {
        node = document.createElement('div');
        node.id = 'topCenterSuccessMessage';
        node.className = 'top-center-success-message';
        document.body.appendChild(node);
    }

    node.textContent = message;
    node.classList.add('show');

    clearTimeout(window.topCenterMessageTimer);
    window.topCenterMessageTimer = setTimeout(() => {
        node.classList.remove('show');
    }, 1800);
}

const SIDEBAR_WIDTH_KEY = 'bibliogest_sidebar_width';
const SIDEBAR_MIN_WIDTH = 72;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_COMPACT_BREAKPOINT = 140;

function clampSidebarWidth(width) {
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

function applySidebarWidth(width) {
    const safeWidth = clampSidebarWidth(width);
    document.documentElement.style.setProperty('--sidebar-width', `${safeWidth}px`);
    if (safeWidth <= SIDEBAR_COMPACT_BREAKPOINT) {
        document.body.classList.add('sidebar-compact');
    } else {
        document.body.classList.remove('sidebar-compact');
    }
    return safeWidth;
}

function initResizableSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !mainContent) return;

    if (window.innerWidth <= 768) {
        document.body.classList.remove('sidebar-compact');
        const existingResizer = document.getElementById('sidebarResizer');
        if (existingResizer) existingResizer.remove();
        return;
    }

    const savedWidth = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
    if (!Number.isNaN(savedWidth)) {
        applySidebarWidth(savedWidth);
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
        applySidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
        const currentWidth = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').replace('px', '').trim();
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(parseInt(currentWidth, 10)));
        document.body.classList.remove('resizing-sidebar');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', (event) => {
        event.preventDefault();
        startX = event.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        document.body.classList.add('resizing-sidebar');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier si l'utilisateur est connecté
    if (!localStorage.getItem('isLoggedIn') && !isLoginPage()) {
        window.location.href = getLoginUrl();
    }
    
    // Afficher la date du jour
    displayCurrentDate();
    applyFeatureToggles();
    initResizableSidebar();
    window.addEventListener('resize', initResizableSidebar);
    
    // Charger les données selon la page
    if (document.getElementById('booksContainer')) {
        await displayLivres();
    }
    
    if (document.getElementById('membersTableBody')) {
        await displayMembres();
    }
    
    if (document.getElementById('loansTableBody')) {
        await displayEmprunts();
    }
    
    if (document.getElementById('recentEmprunts')) {
        await refreshDashboardData();
        startDashboardAutoRefresh();
    }
    
    // Gestionnaires d'événements
    await setupEventListeners();
});

window.addEventListener('settingsChanged', async function() {
    applyFeatureToggles();

    if (document.getElementById('loansTableBody')) {
        await displayEmprunts();
    }

    if (document.getElementById('recentEmprunts')) {
        if (window.dashboardRefreshInterval) {
            clearInterval(window.dashboardRefreshInterval);
            window.dashboardRefreshInterval = null;
        }
        if (isDashboardAutoRefreshEnabled()) {
            startDashboardAutoRefresh();
        }
    }
});

// Afficher la date actuelle
function displayCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date().toLocaleDateString('fr-FR', options);
        dateElement.textContent = today;
    }
}

// Afficher les livres
async function displayLivres() {
    const container = document.getElementById('booksContainer');
    if (!container) return;
    
    const livres = await getLivres();
    container.innerHTML = livres.map(livre => createBookCard(livre)).join('');
}

// Créer une carte livre
function createBookCard(livre) {
    const statusClass = livre.disponible > 0 ? 'status-available' : 'status-borrowed';
    const statusText = livre.disponible > 0 ? `Disponible: ${livre.disponible}/${livre.total}` : `Emprunté: ${livre.empruntes || 0}`;
    const coverUrl = resolveMediaUrl(livre.couverture);
    const coverHtml = coverUrl
        ? `<img src="${coverUrl}" alt="Couverture de ${livre.titre}" class="book-card-cover">`
        : `<div class="book-card-cover-placeholder">📖</div>`;
    
    return `
        <div class="book-card">
            <div class="book-card-cover-wrapper">${coverHtml}</div>
            <div class="book-header">
                <span class="book-title">📖 ${livre.titre}</span>
                <span class="book-isbn">ISBN: ${livre.isbn}</span>
            </div>
            <span class="book-author">${livre.auteur}</span>
            <span class="book-editor">${livre.editeur}, ${livre.annee}</span>
            <div class="book-rating">⭐ ${livre.note}</div>
            <span class="book-status ${statusClass}">${statusText}</span>
            <div class="book-actions">
                <button onclick="ouvrirFormulaireModificationLivre(${livre.id})" class="btn-edit"> Modifier</button>
                <button onclick="supprimerLivre(${livre.id})" class="btn-delete">Supprimer</button>
            </div>
        </div>
    `;
}

function resolveMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : `${window.location.protocol}//${window.location.host}/api`;
    const backendOrigin = apiBase.replace(/\/api\/?$/, '');
    if (url.startsWith('/')) return `${backendOrigin}${url}`;
    return `${backendOrigin}/${url}`;
}

// Afficher les membres
async function displayMembres() {
    const tableBody = document.getElementById('membersTableBody');
    if (!tableBody) return;
    
    const membres = await getMembres();
    tableBody.innerHTML = membres.map(membre => `
        <tr>
            <td>${membre.id}</td>
            <td>${membre.nom}</td>
            <td>${membre.email}</td>
            <td>${membre.telephone}</td>
            <td>
                <span class="status-badge ${getMembreStatusClass(membre.statut)}">
                    ${membre.statut}
                </span>
            </td>
            <td>
                
                <button onclick="ouvrirModificationStatutMembre(${membre.id})" class="btn-edit">modifier</button>
                <button onclick="supprimerMembre(${membre.id})" class="btn-delete">supprimer</button>
            </td>
        </tr>
    `).join('');
    
    // Mettre à jour les statistiques
    updateMemberStats(membres);
}

// Afficher les emprunts
async function displayEmprunts() {
    const tableBody = document.getElementById('loansTableBody');
    if (!tableBody) return;
    
    const emprunts = await getEmprunts();
    tableBody.innerHTML = emprunts.map(emprunt => {
        const statusClass = getEmpruntStatusClass(emprunt.statut);
        const statusText = getEmpruntStatusText(emprunt.statut);
        const rowClass = emprunt.statut === 'retard' && isHighlightLateEnabled() ? 'loan-row-retard' : '';
        
        return `
            <tr class="${rowClass}">
                <td>${emprunt.id}</td>
                <td>${emprunt.livre_titre}</td>
                <td>${emprunt.membre_nom}</td>
                <td>${formatDate(emprunt.date_emprunt)}</td>
                <td>${formatDate(emprunt.date_retour_prevue)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <button onclick="ouvrirModificationStatutEmprunt(${emprunt.id})" class="btn-edit">modifier</button>
                    <button onclick="confirmerRetourEmprunt(${emprunt.id})" class="btn-success">confirmer</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Afficher les emprunts récents
async function displayRecentEmprunts() {
    const container = document.getElementById('recentEmprunts');
    if (!container) return;
    
    const emprunts = await getEmprunts();
    const recentEmprunts = emprunts.slice(0, 3);
    container.innerHTML = recentEmprunts.map(emprunt => `
        <div class="activity-item">
            <span>• ${emprunt.livre_titre} - ${emprunt.membre_nom}</span>
            <span>Retour: ${formatDate(emprunt.date_retour_prevue)}</span>
        </div>
    `).join('');
}

// Afficher les retards
async function displayRetards() {
    const container = document.getElementById('retardsList');
    if (!container) return;
    
    const emprunts = await getEmprunts();
    const retards = emprunts.filter(e => e.statut === 'retard');
    container.innerHTML = retards.map(retard => {
        const joursRetard = calculateJoursRetard(retard.date_retour_prevue);
        return `
            <div class="activity-item">
                <span>• ${retard.livre_titre} - ${retard.membre_nom}</span>
                <span style="color: var(--danger-color);">Retard: ${joursRetard}j</span>
            </div>
        `;
    }).join('');
}

// Formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Calculer les jours de retard
function calculateJoursRetard(dateRetour) {
    const today = new Date();
    const retour = new Date(dateRetour);
    const diffTime = today - retour;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getMembreStatusClass(statut) {
    if (statut === 'Actif') return 'status-active';
    if (statut === 'Suspendu') return 'status-suspended';
    return 'status-borrowed';
}

function normalizeMembreStatut(input) {
    const normalized = (input || '').trim().toLowerCase();
    if (normalized === '1' || normalized === 'actif') return 'Actif';
    if (normalized === '2' || normalized === 'suspendu') return 'Suspendu';
    if (normalized === '3' || normalized === 'inactif') return 'Inactif';
    return null;
}

function getEmpruntStatusClass(statut) {
    if (statut === 'en_cours') return 'status-active';
    if (statut === 'retard') return 'status-suspended';
    if (statut === 'perdu') return 'status-suspended';
    return 'status-borrowed';
}

function getEmpruntStatusText(statut) {
    if (statut === 'en_cours') return 'En cours';
    if (statut === 'retard') return 'En retard';
    if (statut === 'perdu') return 'Perdu';
    if (statut === 'retourne') return 'Livre retourne';
    return statut || '';
}

function normalizeEmpruntStatut(input) {
    const normalized = (input || '').trim().toLowerCase();
    if (normalized === '1' || normalized === 'en cours' || normalized === 'en_cours') return 'en_cours';
    if (normalized === '2' || normalized === 'en retard' || normalized === 'retard') return 'retard';
    if (normalized === '3' || normalized === 'perdu') return 'perdu';
    return null;
}

function isDashboardPage() {
    return Boolean(document.getElementById('recentEmprunts'));
}

async function refreshDashboardData() {
    await updateDashboardStats();
    await displayRecentEmprunts();
    await displayRetards();
    await initChart();
}

function startDashboardAutoRefresh() {
    if (!isDashboardPage() || !isDashboardAutoRefreshEnabled()) return;

    if (window.dashboardRefreshInterval) {
        clearInterval(window.dashboardRefreshInterval);
    }

    // Rafraichit toutes les 30 secondes sans rechargement de page.
    window.dashboardRefreshInterval = setInterval(() => {
        refreshDashboardData();
    }, 30000);

    // Rafraichit aussi quand l'utilisateur revient sur l'onglet.
    if (!window.dashboardVisibilityHandlerBound) {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                refreshDashboardData();
            }
        });
        window.dashboardVisibilityHandlerBound = true;
    }
}

// Mettre à jour les statistiques du dashboard
async function updateDashboardStats() {
    const [livres, membres, emprunts] = await Promise.all([
        getLivres(),
        getMembres(),
        getEmprunts()
    ]);

    const totalLivres = Array.isArray(livres) ? livres.length : 0;
    const totalMembres = Array.isArray(membres) ? membres.length : 0;
    const totalEmpruntsActifs = Array.isArray(emprunts)
        ? emprunts.filter(emprunt => emprunt.statut === 'en_cours' || emprunt.statut === 'retard').length
        : 0;
    const totalRetards = Array.isArray(emprunts)
        ? emprunts.filter(emprunt => emprunt.statut === 'retard').length
        : 0;

    const totalLivresElement = document.getElementById('totalLivres');
    const totalEmpruntsElement = document.getElementById('totalEmprunts');
    const totalMembresElement = document.getElementById('totalMembres');
    const totalRetardsElement = document.getElementById('totalRetards');

    if (totalLivresElement) totalLivresElement.textContent = totalLivres;
    if (totalEmpruntsElement) totalEmpruntsElement.textContent = totalEmpruntsActifs;
    if (totalMembresElement) totalMembresElement.textContent = totalMembres;
    if (totalRetardsElement) totalRetardsElement.textContent = totalRetards;
}

// Mettre à jour les statistiques des membres
function updateMemberStats(membres) {
    if (!membres) return;
    const actifs = membres.filter(m => m.statut === 'Actif').length;
    const suspendus = membres.filter(m => m.statut === 'Suspendu').length;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nouveauxCeMois = membres.filter(membre => {
        if (!membre.date_inscription) return false;
        const inscriptionDate = new Date(membre.date_inscription);
        return inscriptionDate.getMonth() === currentMonth && inscriptionDate.getFullYear() === currentYear;
    }).length;
    
    const statElement = document.getElementById('totalMembresStat');
    const actifElement = document.getElementById('actifsStat');
    const suspendElement = document.getElementById('suspensionStat');
    const nouveauxElement = document.getElementById('nouveauxStat');
    
    if (statElement) statElement.textContent = membres.length;
    if (actifElement) actifElement.textContent = actifs;
    if (suspendElement) suspendElement.textContent = suspendus;
    if (nouveauxElement) nouveauxElement.textContent = nouveauxCeMois;
}

// Initialiser le graphique
async function initChart() {
    const canvas = document.getElementById('activityChart');
    if (!canvas) return;
    
    // Récupérer les emprunts et membres pour les statistiques
    const emprunts = await getEmprunts();
    const membres = await getMembres();
    console.log('Membres pour le graphique:', membres);
    // Créer un objet pour compter les emprunts et membres par jour
    const counts = {};
    const memberCounts = {};
    const today = new Date();
    // Initialiser les 7 derniers jours
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dateKey = date.toISOString().split('T')[0];
        counts[dateKey] = { day: dateStr, count: 0 };
        memberCounts[dateKey] = { day: dateStr, count: 0 };
    }
    // Compter les emprunts par jour
    emprunts.forEach(emprunt => {
        const dateKey = emprunt.date_emprunt.split('T')[0];
        if (counts[dateKey]) {
            counts[dateKey].count++;
        }
    });
    // Compter les membres ajoutés par jour
    membres.forEach(membre => {
        if (!membre.date_inscription) return;
        // Prendre la date locale (sans fuseau) pour correspondre à la clé
        const dateObj = new Date(membre.date_inscription);
        const dateKey = dateObj.toISOString().split('T')[0];
        if (memberCounts[dateKey]) {
            memberCounts[dateKey].count++;
        }
    });
    const labels = Object.values(counts).map(d => d.day);
    const data = Object.values(counts).map(d => d.count);
    const dataMembres = Object.values(memberCounts).map(d => d.count);
    console.log('Data membres pour le graphique:', dataMembres);
    const ctx = canvas.getContext('2d');
    if (window.chartInstance) {
        window.chartInstance.destroy();
    }
    window.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Emprunts',
                    data: data,
                    borderColor: '#3498DB',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: '#3498DB'
                },
                {
                    label: 'Membres ajoutés',
                    data: dataMembres,
                    borderColor: 'orange',
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: 'orange'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Gestionnaires d'événements
async function setupEventListeners() {
    // Formulaire d'ajout de livre
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) {
        addBookForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const livre = new FormData();
            livre.append('titre', document.getElementById('titre').value);
            livre.append('auteur', document.getElementById('auteur').value);
            livre.append('isbn', document.getElementById('isbn').value);
            livre.append('editeur', document.getElementById('editeur').value);
            livre.append('annee', parseInt(document.getElementById('annee').value));
            livre.append('genre', document.getElementById('genre').value);
            livre.append('total', parseInt(document.getElementById('exemplaires').value || 1));
            livre.append('disponible', parseInt(document.getElementById('exemplaires').value || 1));
            livre.append('description', document.getElementById('description')?.value || '');
            livre.append('emplacement', document.getElementById('emplacement').value);
            livre.append('note', 0);

            const coverFile = document.getElementById('bookCoverInput')?.files?.[0];
            if (coverFile) {
                livre.append('couverture', coverFile);
            }
            
            const resultat = await ajouterLivre(livre);
            if (resultat) {
                window.location.href = './livres.html';
            }
        });
    }

    // Formulaire ajouter membre
    const addMemberForm = document.getElementById('addMemberForm');
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const membre = {
                nom: document.getElementById('nom').value,
                email: document.getElementById('email').value,
                telephone: document.getElementById('telephone').value,
                adresse: document.getElementById('adresse').value,
                statut: document.getElementById('statut').value,
                note: document.getElementById('note')?.value || ''
            };
            
            const resultat = await ajouterMembre(membre);
            if (resultat) {
                window.location.href = './membres.html';
            }
        });
    }
    
    // Gestionnaire du formulaire d'emprunt
    const addLoanForm = document.getElementById('addLoanForm');
    if (addLoanForm) {
        // Charger les listes de livres et membres
        loadLivresForSelect();
        loadMembresForSelect();
        
        addLoanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emprunt = {
                livre: document.getElementById('livre').value,
                membre: document.getElementById('membre').value,
                date_emprunt: document.getElementById('date_emprunt').value || new Date().toISOString().split('T')[0],
                date_retour_prevue: document.getElementById('date_retour_prevue').value,
                notes: document.getElementById('notes').value || ''
            };
            
            if (!emprunt.livre || !emprunt.membre || !emprunt.date_retour_prevue) {
                alert('Veuillez remplir tous les champs obligatoires');
                return;
            }
            
            const resultat = await ajouterEmprunt(emprunt);
            if (resultat) {
                window.location.href = './emprunts.html';
            }
        });
    }
    
    // Recherche de livres
    const searchLivres = document.getElementById('searchLivres');
    if (searchLivres) {
        searchLivres.addEventListener('input', async function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const livres = await getLivres();
            const filtered = livres.filter(livre => livre.titre.toLowerCase().includes(searchTerm));
            
            const container = document.getElementById('booksContainer');
            container.innerHTML = filtered.map(livre => createBookCard(livre)).join('');
        });
    }

    // Recherche de membres
    const searchMembres = document.getElementById('searchMembres');
    if (searchMembres) {
        searchMembres.addEventListener('input', async function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const membres = await getMembres();
            const filtered = membres.filter(membre =>
                membre.nom.toLowerCase().includes(searchTerm) ||
                membre.email.toLowerCase().includes(searchTerm) ||
                (membre.telephone || '').toLowerCase().includes(searchTerm)
            );

            const tableBody = document.getElementById('membersTableBody');
            tableBody.innerHTML = filtered.map(membre => `
                <tr>
                    <td>${membre.id}</td>
                    <td>${membre.nom}</td>
                    <td>${membre.email}</td>
                    <td>${membre.telephone}</td>
                    <td>
                        <span class="status-badge ${getMembreStatusClass(membre.statut)}">
                            ${membre.statut}
                        </span>
                    </td>
                    <td>
                        <button onclick="ouvrirModificationStatutMembre(${membre.id})" class="btn-edit">modifier</button>
                        <button onclick="supprimerMembre(${membre.id})" class="btn-delete">supprimer</button>
                    </td>
                </tr>
            `).join('');

            updateMemberStats(filtered);
        });
    }

    // Recherche d'emprunts
    const searchEmprunts = document.getElementById('searchEmprunts');
    if (searchEmprunts) {
        searchEmprunts.addEventListener('input', async function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const emprunts = await getEmprunts();
            const filtered = emprunts.filter(emprunt =>
                emprunt.livre_titre.toLowerCase().includes(searchTerm) ||
                emprunt.membre_nom.toLowerCase().includes(searchTerm) ||
                getEmpruntStatusText(emprunt.statut).toLowerCase().includes(searchTerm) ||
                String(emprunt.id).includes(searchTerm)
            );

            const tableBody = document.getElementById('loansTableBody');
            tableBody.innerHTML = filtered.map(emprunt => `
                <tr class="${emprunt.statut === 'retard' && isHighlightLateEnabled() ? 'loan-row-retard' : ''}">
                    <td>${emprunt.id}</td>
                    <td>${emprunt.livre_titre}</td>
                    <td>${emprunt.membre_nom}</td>
                    <td>${formatDate(emprunt.date_emprunt)}</td>
                    <td>${formatDate(emprunt.date_retour_prevue)}</td>
                    <td>
                        <span class="status-badge ${getEmpruntStatusClass(emprunt.statut)}">${getEmpruntStatusText(emprunt.statut)}</span>
                    </td>
                    <td>
                        <button onclick="ouvrirModificationStatutEmprunt(${emprunt.id})" class="btn-edit">modifier</button>
                        <button onclick="confirmerRetourEmprunt(${emprunt.id})" class="btn-success">confirmer</button>
                    </td>
                </tr>
            `).join('');
        });
    }
    
    // Filtres
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            if (filter === 'all') {
                await displayLivres();
            } else {
                const livres = await getLivres();
                const filtered = livres.filter(livre => livre.genre === filter);
                const container = document.getElementById('booksContainer');
                container.innerHTML = filtered.map(livre => createBookCard(livre)).join('');
            }
        });
    });
    
    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('isLoggedIn');
            window.location.href = getLoginUrl();
        });
    }

    // Prolongation d'emprunt par numero (section "Prolonger un emprunt")
    let extensionDays = 7;
    const loanIdInput = document.getElementById('loanIdInput');
    const add7DaysBtn = document.getElementById('add7DaysBtn');
    const add14DaysBtn = document.getElementById('add14DaysBtn');
    const validateExtensionBtn = document.getElementById('validateExtensionBtn');

    if (add7DaysBtn) {
        add7DaysBtn.addEventListener('click', function() {
            extensionDays = 7;
        });
    }

    if (add14DaysBtn) {
        add14DaysBtn.addEventListener('click', function() {
            extensionDays = 14;
        });
    }

    if (validateExtensionBtn && loanIdInput) {
        validateExtensionBtn.addEventListener('click', async function() {
            const id = parseInt(loanIdInput.value, 10);
            if (Number.isNaN(id) || id <= 0) {
                loanIdInput.focus();
                return;
            }

            const resultat = await prolongerEmprunt(id, extensionDays);
            if (resultat) {
                showTopCenterSuccess(`Emprunt ${id} prolonge de ${extensionDays} jours.`);
                loanIdInput.value = '';
                await displayEmprunts();
            }
        });
    }
}
// Fonctions CRUD
function ouvrirFormulaireModificationLivre(id) {
    window.location.href = `modifier-livre.html?id=${id}`;
}

async function supprimerLivre(id) {
    window.location.href = `supprimer-livre.html?id=${id}`;
}

async function deleteBook(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/livres/${id}/`, {
            method: 'DELETE'
        });
        console.log('Réponse statut suppression:', response.status);
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        return true;
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur: ' + error.message);
        return false;
    }
}


function voirMembre(id) {
    alert(`Fiche membre #${id}`);
}

async function ouvrirModificationStatutMembre(id) {
    window.location.href = `modifier-membre.html?id=${id}`;
}

async function supprimerMembre(id) {
    window.location.href = `supprimer-membre.html?id=${id}`;
}

async function supprimerEmprunt(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet emprunt ?')) {
        const resultat = await deleteEmprunt(id);
        if (resultat) {
            alert('Emprunt supprimé avec succès !');
            await displayEmprunts();
        }
    }
}

async function ouvrirModificationStatutEmprunt(id) {
    window.location.href = `modifier-emprunt.html?id=${id}`;
}

async function confirmerRetourEmprunt(id) {
    window.location.href = `confirmer-emprunt.html?id=${id}`;
}

async function initDeleteBookPage() {
    const deleteBookForm = document.getElementById('deleteBookForm');
    if (!deleteBookForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const livreId = urlParams.get('id');
    if (!livreId) {
        alert('ID du livre manquant');
        window.location.href = 'livres.html';
        return;
    }

    const livre = await getLivre(livreId);
    const livreInfo = document.getElementById('deleteBookInfo');
    if (livre && livreInfo) {
        livreInfo.textContent = `${livre.titre} (${livre.auteur})`;
    }

    deleteBookForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultat = await deleteBook(livreId);
        if (resultat) {
            window.location.href = 'livres.html';
        }
    });
}

async function initDeleteMemberPage() {
    const deleteMemberForm = document.getElementById('deleteMemberForm');
    if (!deleteMemberForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const membreId = urlParams.get('id');
    if (!membreId) {
        alert('ID du membre manquant');
        window.location.href = 'membres.html';
        return;
    }

    const membre = await getMembre(membreId);
    const membreInfo = document.getElementById('deleteMemberInfo');
    if (membre && membreInfo) {
        membreInfo.textContent = `${membre.nom} (${membre.email})`;
    }

    deleteMemberForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultat = await deleteMember(membreId);
        if (resultat) {
            window.location.href = 'membres.html';
        }
    });
}

async function initEditMemberPage() {
    const editMemberForm = document.getElementById('editMemberForm');
    if (!editMemberForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const membreId = urlParams.get('id');
    if (!membreId) {
        alert('ID du membre manquant');
        window.location.href = 'membres.html';
        return;
    }

    const membre = await getMembre(membreId);
    if (!membre) {
        alert('Membre introuvable');
        window.location.href = 'membres.html';
        return;
    }

    document.getElementById('nom').value = membre.nom || '';
    document.getElementById('email').value = membre.email || '';
    document.getElementById('telephone').value = membre.telephone || '';
    document.getElementById('adresse').value = membre.adresse || '';
    document.getElementById('statut').value = membre.statut || 'Actif';
    document.getElementById('note').value = membre.note || '';

    editMemberForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const membreModifie = {
            nom: document.getElementById('nom').value,
            email: document.getElementById('email').value,
            telephone: document.getElementById('telephone').value,
            adresse: document.getElementById('adresse').value,
            statut: document.getElementById('statut').value,
            note: document.getElementById('note').value
        };

        const resultat = await modifierMembre(membreId, membreModifie);
        if (resultat) {
            window.location.href = 'membres.html';
        }
    });
}

async function initEditLoanPage() {
    const editLoanForm = document.getElementById('editLoanForm');
    if (!editLoanForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const empruntId = urlParams.get('id');
    if (!empruntId) {
        alert('ID de l\'emprunt manquant');
        window.location.href = 'emprunts.html';
        return;
    }

    const emprunt = await getEmprunt(empruntId);
    if (!emprunt) {
        alert('Emprunt introuvable');
        window.location.href = 'emprunts.html';
        return;
    }

    document.getElementById('livreInfo').value = emprunt.livre_titre || '';
    document.getElementById('membreInfo').value = emprunt.membre_nom || '';
    document.getElementById('dateEmprunt').value = formatDate(emprunt.date_emprunt);
    document.getElementById('dateRetourPrevue').value = emprunt.date_retour_prevue || '';
    document.getElementById('statutEmprunt').value = emprunt.statut || 'en_cours';
    document.getElementById('notesEmprunt').value = emprunt.notes || '';

    editLoanForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const empruntModifie = {
            livre: emprunt.livre,
            membre: emprunt.membre,
            date_retour_prevue: document.getElementById('dateRetourPrevue').value,
            date_retour_effective: emprunt.date_retour_effective,
            statut: document.getElementById('statutEmprunt').value,
            notes: document.getElementById('notesEmprunt').value || ''
        };

        const resultat = await modifierEmprunt(empruntId, empruntModifie);
        if (resultat) {
            window.location.href = 'emprunts.html';
        }
    });
}

async function initConfirmLoanPage() {
    const confirmLoanForm = document.getElementById('confirmLoanForm');
    if (!confirmLoanForm) return;

    const urlParams = new URLSearchParams(window.location.search);
    const empruntId = urlParams.get('id');
    if (!empruntId) {
        alert('ID de l\'emprunt manquant');
        window.location.href = 'emprunts.html';
        return;
    }

    const emprunt = await getEmprunt(empruntId);
    if (!emprunt) {
        alert('Emprunt introuvable');
        window.location.href = 'emprunts.html';
        return;
    }

    const info = document.getElementById('confirmLoanInfo');
    if (info) {
        info.textContent = `${emprunt.livre_titre} - ${emprunt.membre_nom}`;
    }

    confirmLoanForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const resultat = await retournerLivre(empruntId);
        if (resultat) {
            window.location.href = 'emprunts.html';
        }
    });
}

// Charger les livres disponibles dans le select du formulaire d'emprunt
async function loadLivresForSelect() {
    const select = document.getElementById('livre');
    if (!select) return;
    
    const livres = await getLivres();
    if (livres && livres.length > 0) {
        livres.forEach(livre => {
            const option = document.createElement('option');
            option.value = livre.id;
            option.textContent = `${livre.titre} (${livre.auteur})`;
            select.appendChild(option);
        });
    }
}

// Charger les membres dans le select du formulaire d'emprunt
async function loadMembresForSelect() {
    const select = document.getElementById('membre');
    if (!select) return;
    
    const membres = await getMembres();
    if (membres && membres.length > 0) {
        membres.forEach(membre => {
            const option = document.createElement('option');
            option.value = membre.id;
            option.textContent = `${membre.nom} (${membre.email})`;
            select.appendChild(option);
        });
    }
}

function initBookCoverUpload() {
    const coverInput = document.getElementById('bookCoverInput');
    const uploadBtn = document.getElementById('coverUploadBtn');
    const coverPreview = document.getElementById('coverPreview');

    if (!coverInput || !uploadBtn || !coverPreview) return;

    uploadBtn.addEventListener('click', function() {
        coverInput.click();
    });

    coverInput.addEventListener('change', function() {
        const file = coverInput.files && coverInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            coverPreview.classList.add('has-image');
            coverPreview.innerHTML = `<img src="${event.target.result}" alt="Couverture du livre" class="cover-preview-image">`;
        };
        reader.readAsDataURL(file);
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    await initDeleteBookPage();
    await initDeleteMemberPage();
    await initEditMemberPage();
    await initEditLoanPage();
    await initConfirmLoanPage();
    initBookCoverUpload();
});
