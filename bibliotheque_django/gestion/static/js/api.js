// ============================================
// API REST - CONNEXION À DJANGO
// ============================================

const API_BASE_URL = (() => {
    // Mode fichier local (file://): on garde localhost pour le backend Django local
    if (window.location.protocol === 'file:') {
        return 'http://localhost:8000/api';
    }

    // Hébergé (PythonAnywhere ou autre): utiliser le même domaine que la page
    return `${window.location.origin}/api`;
})();

const IS_LOCAL_FILE_MODE = window.location.protocol === 'file:';
const API_ORIGIN = new URL(API_BASE_URL).origin;
let csrfTokenCache = '';

function getCsrfTokenFromCookie() {
    const cookieName = 'csrftoken=';
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(cookieName)) {
            return decodeURIComponent(cookie.substring(cookieName.length));
        }
    }
    return '';
}

function getCsrfTokenFromDom() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta?.content) {
        return meta.content;
    }
    const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (input?.value) {
        return input.value;
    }
    return '';
}

async function ensureCsrfToken() {
    const cookieToken = getCsrfTokenFromCookie();
    if (cookieToken) {
        return cookieToken;
    }

    const domToken = getCsrfTokenFromDom();
    if (domToken) {
        return domToken;
    }

    if (csrfTokenCache) {
        return csrfTokenCache;
    }

    try {
        const response = await originalFetch(`${API_BASE_URL}/csrf/`, {
            method: 'GET',
            credentials: IS_LOCAL_FILE_MODE ? 'include' : 'same-origin',
        });

        if (!response.ok) {
            return '';
        }

        const data = await response.json();
        csrfTokenCache = data?.csrfToken || '';
        return csrfTokenCache;
    } catch (error) {
        console.warn('Impossible de récupérer le token CSRF:', error);
        return '';
    }
}

const originalFetch = window.fetch.bind(window);
window.fetch = async function(input, init = {}) {
    const requestUrl = typeof input === 'string' ? input : input?.url || '';
    const normalizedUrl = requestUrl ? new URL(requestUrl, window.location.href) : null;
    const method = (init.method || 'GET').toUpperCase();
    const isUnsafeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isApiRequest = normalizedUrl
        ? normalizedUrl.href.startsWith(API_BASE_URL) ||
          (normalizedUrl.origin === API_ORIGIN && normalizedUrl.pathname.startsWith('/api/'))
        : false;

    const nextInit = { ...init };
    const headers = new Headers(init.headers || {});

    if (isApiRequest) {
        // Keep Django session/cookies on local file mode and same-origin pages.
        if (!nextInit.credentials) {
            nextInit.credentials = IS_LOCAL_FILE_MODE ? 'include' : 'same-origin';
        }

        if (isUnsafeMethod) {
            const csrfToken = await ensureCsrfToken();
            if (csrfToken && !headers.has('X-CSRFToken')) {
                headers.set('X-CSRFToken', csrfToken);
            }
        }
    }

    nextInit.headers = headers;
    return originalFetch(input, nextInit);
};

// ===== LIVRES =====

async function getLivres() {
    try {
        const response = await fetch(`${API_BASE_URL}/livres/`);
        if (!response.ok) throw new Error('Erreur lors du chargement des livres');
        const data = await response.json();
        return data.results ? data.results : data;
    } catch (error) {
        console.error('Erreur API Livres:', error);
        return [];
    }
}

async function ajouterLivre(livre) {
    try {
        const isFormData = livre && typeof livre.append === 'function' && typeof livre.get === 'function';
        const options = {
            method: 'POST',
            body: isFormData ? livre : JSON.stringify(livre)
        };
        if (!isFormData) {
            options.headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch(`${API_BASE_URL}/livres/`, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }
        const result = await response.json();
        console.log('Livre créé:', result);
        return result;
    } catch (error) {
        console.error('Erreur API Ajouter Livre:', error);
        alert('Erreur lors de l\'ajout du livre: ' + error.message);
        return null;
    }
}

async function getLivre(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/livres/${id}/`);
        if (!response.ok) throw new Error('Livre non trouvé');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Récupérer Livre:', error);
        return null;
    }
}

async function modifierLivre(id, livre) {
    try {
        console.log('Envoi de la modification du livre:', livre);
        const isFormData = livre && typeof livre.append === 'function' && typeof livre.get === 'function';
        const options = {
            method: 'PUT',
            body: isFormData ? livre : JSON.stringify(livre)
        };
        if (!isFormData) {
            options.headers = { 'Content-Type': 'application/json' };
        }

        const response = await fetch(`${API_BASE_URL}/livres/${id}/`, options);
        console.log('Réponse statut:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreurs du serveur:', errorData);
            const errorMsg = errorData.detail || errorData.non_field_errors?.[0] || JSON.stringify(errorData);
            throw new Error(errorMsg);
        }
        const result = await response.json();
        console.log('Livre modifié:', result);
        return result;
    } catch (error) {
        console.error('Erreur API Modifier Livre:', error);
        alert('Erreur lors de la modification: ' + error.message);
        return null;
    }
}

async function supprimerLivre(id) {
    try {
        console.log('Suppression du livre:', id);
        const response = await fetch(`${API_BASE_URL}/livres/${id}/`, {
            method: 'DELETE'
        });
        console.log('Réponse statut:', response.status);
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        return true;
    } catch (error) {
        console.error('Erreur API Supprimer Livre:', error);
        alert('Erreur: ' + error.message);
        return false;
    }
}

async function getLivresDisponibles() {
    try {
        const response = await fetch(`${API_BASE_URL}/livres/disponibles/`);
        if (!response.ok) throw new Error('Erreur');
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}


// ===== MEMBRES =====

async function getMembres() {
    try {
        const response = await fetch(`${API_BASE_URL}/membres/`);
        if (!response.ok) throw new Error('Erreur lors du chargement des membres');
        const data = await response.json();
        return data.results ? data.results : data;
    } catch (error) {
        console.error('Erreur API Membres:', error);
        return [];
    }
}

async function getMembre(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/membres/${id}/`);
        if (!response.ok) throw new Error('Membre non trouvé');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Récupérer Membre:', error);
        return null;
    }
}

async function ajouterMembre(membre) {
    try {
        console.log('Envoi du membre:', membre);
        const response = await fetch(`${API_BASE_URL}/membres/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(membre)
        });
        console.log('Réponse statut:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreurs du serveur:', errorData);
            const errorMsg = errorData.detail || errorData.non_field_errors?.[0] || JSON.stringify(errorData);
            throw new Error(errorMsg);
        }
        const result = await response.json();
        console.log('Membre créé:', result);
        return result;
    } catch (error) {
        console.error('Erreur API Ajouter Membre:', error);
        alert('Erreur lors de l\'ajout du membre: ' + error.message);
        return null;
    }
}

async function modifierMembre(id, membre) {
    try {
        const response = await fetch(`${API_BASE_URL}/membres/${id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(membre)
        });
        if (!response.ok) throw new Error('Erreur lors de la modification');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Modifier Membre:', error);
        alert('Erreur: ' + error.message);
    }
}

async function deleteMember(id) {
    try {
        console.log('Suppression du membre:', id);
        const response = await fetch(`${API_BASE_URL}/membres/${id}/`, {
            method: 'DELETE'
        });
        console.log('Réponse statut:', response.status);
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        return true;
    } catch (error) {
        console.error('Erreur API Supprimer Membre:', error);
        alert('Erreur: ' + error.message);
        return false;
    }
}

async function getMembresActifs() {
    try {
        const response = await fetch(`${API_BASE_URL}/membres/actifs/`);
        if (!response.ok) throw new Error('Erreur');
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}


// ===== EMPRUNTS =====

async function getEmprunts() {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/`);
        if (!response.ok) throw new Error('Erreur lors du chargement des emprunts');
        const data = await response.json();
        return data.results ? data.results : data;
    } catch (error) {
        console.error('Erreur API Emprunts:', error);
        return [];
    }
}

async function getEmprunt(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/${id}/`);
        if (!response.ok) throw new Error('Emprunt non trouvé');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Récupérer Emprunt:', error);
        return null;
    }
}

async function ajouterEmprunt(emprunt) {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emprunt)
        });
        if (!response.ok) {
            const errorData = await response.json();
            const errorMsg = errorData.detail || errorData.non_field_errors?.[0] || 'Erreur lors de l\'ajout de l\'emprunt';
            throw new Error(errorMsg);
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur API Ajouter Emprunt:', error);
        alert('Erreur: ' + error.message);
        return null;
    }
}

async function modifierEmprunt(id, emprunt) {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/${id}/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emprunt)
        });
        if (!response.ok) throw new Error('Erreur lors de la modification');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Modifier Emprunt:', error);
        alert('Erreur: ' + error.message);
    }
}

async function deleteEmprunt(id) {
    try {
        console.log('Suppression de l\'emprunt:', id);
        const response = await fetch(`${API_BASE_URL}/emprunts/${id}/`, {
            method: 'DELETE'
        });
        console.log('Réponse statut:', response.status);
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        return true;
    } catch (error) {
        console.error('Erreur API Supprimer Emprunt:', error);
        alert('Erreur: ' + error.message);
        return false;
    }
}

async function supprimerEmprunt(id) {
    try {
        console.log('Suppression de l\'emprunt:', id);
        const response = await fetch(`${API_BASE_URL}/emprunts/${id}/`, {
            method: 'DELETE'
        });
        console.log('Réponse statut:', response.status);
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        return true;
    } catch (error) {
        console.error('Erreur API Supprimer Emprunt:', error);
        alert('Erreur: ' + error.message);
        return false;
    }
}

async function prolongerEmprunt(id, jours = 7) {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/${id}/prolonger/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jours: jours })
        });
        if (!response.ok) throw new Error('Erreur lors de la prolongation');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Prolonger:', error);
        alert('Erreur: ' + error.message);
    }
}

async function retournerLivre(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/${id}/retourner/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) throw new Error('Erreur lors du retour');
        return await response.json();
    } catch (error) {
        console.error('Erreur API Retourner:', error);
        alert('Erreur: ' + error.message);
    }
}

async function getEmpruntEnCours() {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/en_cours/`);
        if (!response.ok) throw new Error('Erreur');
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}

async function getEmpruntEnRetard() {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/en_retard/`);
        if (!response.ok) throw new Error('Erreur');
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return [];
    }
}

async function getStatistiquesEmprunts() {
    try {
        const response = await fetch(`${API_BASE_URL}/emprunts/statistiques/`);
        if (!response.ok) throw new Error('Erreur');
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return {
            total_emprunts: 0,
            en_cours: 0,
            en_retard: 0,
            retournes: 0
        };
    }
}
