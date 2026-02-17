// ===== GESTION DU THÈME (MODE CLAIR/NUIT) =====

// Clé pour le localStorage
const THEME_STORAGE_KEY = 'bibliogest_theme';
const SETTINGS_STORAGE_KEY = 'bibliogest_settings';

// Thèmes disponibles
const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

// Initialisation du thème
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initSettings();
    setupThemeEventListeners();
    
    // Mettre à jour les indicateurs visuels dans la page paramètres
    if (window.location.pathname.includes('parametres.html')) {
        updateThemeSelectionUI();
    }
});

// Initialiser le thème au chargement
function initTheme() {
    // Vérifier si un thème est sauvegardé
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Vérifier les préférences système
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? THEMES.DARK : THEMES.LIGHT);
    }
}

// Appliquer le thème
function applyTheme(theme) {
    if (theme === THEMES.DARK) {
        document.body.classList.add('dark-mode');
        localStorage.setItem(THEME_STORAGE_KEY, THEMES.DARK);
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem(THEME_STORAGE_KEY, THEMES.LIGHT);
    }
    
    // Mettre à jour les graphiques si présents
    updateChartsTheme(theme);
    
    // Déclencher un événement personnalisé
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
}

// Basculer entre les thèmes
function toggleTheme() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    applyTheme(isDarkMode ? THEMES.LIGHT : THEMES.DARK);
    updateThemeSelectionUI();
}

// Mettre à jour l'UI de sélection du thème
function updateThemeSelectionUI() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const currentTheme = isDarkMode ? THEMES.DARK : THEMES.LIGHT;
    
    // Mettre à jour les checkmarks
    const checkLight = document.getElementById('check-light');
    const checkDark = document.getElementById('check-dark');
    
    if (checkLight && checkDark) {
        checkLight.style.opacity = currentTheme === THEMES.LIGHT ? '1' : '0';
        checkDark.style.opacity = currentTheme === THEMES.DARK ? '1' : '0';
    }
    
    // Mettre à jour la classe active sur les options
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        const theme = option.dataset.theme;
        if (theme === currentTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Mettre à jour les graphiques selon le thème
function updateChartsTheme(theme) {
    if (window.chartInstance) {
        const isDarkMode = theme === THEMES.DARK;
        
        window.chartInstance.options.scales.y.grid.color = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        window.chartInstance.options.scales.x.grid.color = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        window.chartInstance.options.plugins.tooltip.backgroundColor = isDarkMode ? '#1e272e' : '#2C3E50';
        
        window.chartInstance.update();
    }
}

// Initialiser les paramètres
function initSettings() {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        applySettings(settings);
    }
}

// Appliquer les paramètres
function applySettings(settings) {
    // Densité d'affichage
    if (settings.density) {
        document.body.classList.remove('density-comfortable', 'density-compact', 'density-spacious');
        document.body.classList.add(`density-${settings.density}`);
    }
    
    // Taille de police
    if (settings.fontSize) {
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        document.body.classList.add(`font-${settings.fontSize}`);
    }
    
    // Contraste élevé
    if (settings.highContrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
    
    // Animations globales
    if (settings.animations === false) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
    
    // Surligner les emprunts en retard
    if (settings.highlightLate === false) {
        document.body.classList.remove('highlight-late');
    } else {
        document.body.classList.add('highlight-late');
    }
    
    // Mettre à jour les inputs du formulaire
    updateSettingsForm(settings);

    // Notifier le reste de l'app qu'un réglage a changé
    window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { settings: settings } }));
}

// Mettre à jour le formulaire des paramètres
function updateSettingsForm(settings) {
    const densitySelect = document.getElementById('densitySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const highContrastToggle = document.getElementById('highContrastToggle');
    const dashboardRefreshToggle = document.getElementById('dashboardRefreshToggle');
    const highlightLateToggle = document.getElementById('highlightLateToggle');
    
    if (densitySelect && settings.density) densitySelect.value = settings.density;
    if (fontSizeSelect && settings.fontSize) fontSizeSelect.value = settings.fontSize;
    if (highContrastToggle && settings.highContrast !== undefined) highContrastToggle.checked = settings.highContrast;
    if (dashboardRefreshToggle && settings.dashboardAutoRefresh !== undefined) dashboardRefreshToggle.checked = settings.dashboardAutoRefresh;
    if (highlightLateToggle && settings.highlightLate !== undefined) highlightLateToggle.checked = settings.highlightLate;
}

// Sauvegarder les paramètres
function saveSettings() {
    const settings = {
        density: document.getElementById('densitySelect')?.value || 'compact',
        fontSize: document.getElementById('fontSizeSelect')?.value || 'medium',
        highContrast: document.getElementById('highContrastToggle')?.checked || false,
        dashboardAutoRefresh: document.getElementById('dashboardRefreshToggle')?.checked ?? true,
        highlightLate: document.getElementById('highlightLateToggle')?.checked ?? true,
        theme: document.body.classList.contains('dark-mode') ? THEMES.DARK : THEMES.LIGHT
    };
    
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applySettings(settings);
    
    // Afficher une notification
    showNotification('Paramètres sauvegardés !', 'success');
}

// Réinitialiser les paramètres
function resetSettings() {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    
    // Valeurs par défaut
    const defaultSettings = {
        density: 'compact',
        fontSize: 'medium',
        highContrast: false,
        dashboardAutoRefresh: true,
        highlightLate: true
    };
    
    applySettings(defaultSettings);
    updateSettingsForm(defaultSettings);
    
    showNotification('Paramètres réinitialisés', 'info');
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Fermeture automatique après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Fermeture manuelle
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

// Configurer les événements du thème
function setupThemeEventListeners() {
    // Boutons de sélection du thème
    const themeSelectBtns = document.querySelectorAll('.theme-select-btn');
    themeSelectBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.dataset.theme;
            applyTheme(theme);
            updateThemeSelectionUI();
            saveSettings(); // Sauvegarder automatiquement
        });
    });
    
    // Options de thème cliquables
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            // Éviter de déclencher si on clique sur le bouton
            if (!e.target.classList.contains('theme-select-btn')) {
                const theme = this.dataset.theme;
                applyTheme(theme);
                updateThemeSelectionUI();
                saveSettings();
            }
        });
    });
    
    // Bouton de sauvegarde
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
    
    // Bouton de réinitialisation
    const resetBtn = document.getElementById('resetSettingsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
    
    // Écouter les changements de préférence système
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
        }
    });
}

// Exporter les fonctions pour utilisation globale
window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
