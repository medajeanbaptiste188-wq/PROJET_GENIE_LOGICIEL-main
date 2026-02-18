# Configuration de la Base de Données Django - BiblioGest

## Fichiers créés

### 1. **models.py**
Définit les 3 modèles principaux:
- **Livre**: Gestion du catalogue (titre, auteur, ISBN, genre, disponibilité...)
- **Membre**: Gestion des adhérents (nom, email, statut...)
- **Emprunt**: Gestion des emprunts (livre, membre, dates, statut...)

### 2. **serializers.py**
Sérialise les modèles pour l'API REST:
- `LivreSerializer`
- `MembreSerializer`
- `EmpruntSerializer`

### 3. **views.py**
API REST avec:
- CRUD complet pour Livres, Membres, Emprunts
- Actions personnalisées (prolonger, retourner, suspendre...)
- Filtrage et recherche

### 4. **urls.py**
Configuration des routes API:
```
/api/livres/
/api/membres/
/api/emprunts/
```

### 5. **admin.py**
Interface admin Django personnalisée pour gérer les données

### 6. **forms.py**
Formulaires Django pour les vues classiques

### 7. **apps.py**
Configuration de l'app avec support des signaux

### 8. **signals.py**
Signaux Django pour mettre à jour automatiquement la disponibilité des livres

---

## Installation

### Étapes:

1. **Installer les dépendances**:
```bash
   pip install -r requirements.txt
```

2. **Configurer settings.py**:
   - Ajouter `'rest_framework'` et `'gestion'` à `INSTALLED_APPS`
   - Ajouter la configuration REST Framework (voir `SETTINGS_CONFIGURATION.txt`)

3. **Inclure les URLs**:
   Dans votre `urls.py` principal:
   ```python
   path('', include('gestion.urls')),
   ```

4. **Créer les migrations**:
```bash
   python manage.py makemigrations gestion
   python manage.py migrate
```

5. **Créer un superuser**:
```bash
   python manage.py createsuperuser
```

6. **Démarrer le serveur**:
```bash
   python manage.py runserver
```

---

## Endpoints API

### Livres
- `GET /api/livres/` - Lister tous les livres
- `POST /api/livres/` - Ajouter un livre
- `GET /api/livres/{id}/` - Détails d'un livre
- `PUT /api/livres/{id}/` - Modifier un livre
- `DELETE /api/livres/{id}/` - Supprimer un livre
- `GET /api/livres/disponibles/` - Livres disponibles
- `POST /api/livres/{id}/ajouter_exemplaire/` - Ajouter un exemplaire

### Membres
- `GET /api/membres/` - Lister tous les membres
- `POST /api/membres/` - Ajouter un membre
- `GET /api/membres/{id}/` - Détails d'un membre
- `PUT /api/membres/{id}/` - Modifier un membre
- `DELETE /api/membres/{id}/` - Supprimer un membre
- `GET /api/membres/actifs/` - Membres actifs
- `POST /api/membres/{id}/suspendre/` - Suspendre un membre
- `POST /api/membres/{id}/reactiver/` - Réactiver un membre

### Emprunts
- `GET /api/emprunts/` - Lister tous les emprunts
- `POST /api/emprunts/` - Créer un emprunt
- `GET /api/emprunts/{id}/` - Détails d'un emprunt
- `PUT /api/emprunts/{id}/` - Modifier un emprunt
- `DELETE /api/emprunts/{id}/` - Supprimer un emprunt
- `GET /api/emprunts/en_cours/` - Emprunts en cours
- `GET /api/emprunts/en_retard/` - Emprunts en retard
- `POST /api/emprunts/{id}/prolonger/` - Prolonger un emprunt
- `POST /api/emprunts/{id}/retourner/` - Retourner un livre

---

## Intégration avec votre frontend

Remplacez vos appels `getLivres()`, `getMembres()`, `getEmprunts()` par des appels API:

```javascript
// Exemple: Récupérer les livres
fetch('http://localhost:8000/api/livres/')
  .then(response => response.json())
  .then(data => {
    bibliothequeData.livres = data;
    displayLivres();
  });
```

---

## Base de données

### SQLite (par défaut):
- Fichier: `db.sqlite3`
- Aucune configuration supplémentaire nécessaire

### PostgreSQL (recommandé pour production):
1. Installer: `pip install psycopg2-binary`
2. Configurer dans `settings.py`

---

## Notes improtantes

- Les signaux Django gèrent automatiquement la disponibilité des livres
- Le système détecte automatiquement les retards
- Authentification par session Django (à adapter selon vos besoins)
