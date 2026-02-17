# Deploiement sur PythonAnywhere (Django + Frontend)

Ce projet est pret pour PythonAnywhere. Suis ces etapes dans l'ordre.

## 1) Creer l'app web
- Dans PythonAnywhere: `Web` > `Add a new web app`
- Choisir `Manual configuration` (Python 3.10+)

## 2) Recuperer le code
Dans une console Bash PythonAnywhere:

```bash
cd ~
git clone <URL_DU_REPO>
cd PROJET_GENIE_LOGICIEL-main/bibliotheque_django
```

## 3) Environnement Python
```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 4) Variables d'environnement
Dans PythonAnywhere, onglet `Web` > section `Environment variables`:

- `DJANGO_SECRET_KEY` = une cle longue aleatoire
- `DJANGO_DEBUG` = `False`
- `DJANGO_ALLOWED_HOSTS` = `<ton-username>.pythonanywhere.com`
- `DJANGO_CSRF_TRUSTED_ORIGINS` = `https://<ton-username>.pythonanywhere.com`
- `DJANGO_CORS_ALLOWED_ORIGINS` = `https://<ton-username>.pythonanywhere.com`

## 5) Migration + static
```bash
cd ~/PROJET_GENIE_LOGICIEL-main/bibliotheque_django
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
```

## 6) Configurer le fichier WSGI
Dans `Web` > clique sur le lien du fichier WSGI et garde:

```python
import os
import sys

path = '/home/<ton-username>/PROJET_GENIE_LOGICIEL-main/bibliotheque_django'
if path not in sys.path:
    sys.path.append(path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

## 7) Configurer static/media (onglet Web)
- Static URL: `/static/`
- Static Directory: `/home/<ton-username>/PROJET_GENIE_LOGICIEL-main/bibliotheque_django/staticfiles`

- Media URL: `/media/`
- Media Directory: `/home/<ton-username>/PROJET_GENIE_LOGICIEL-main/bibliotheque_django/media`

## 8) Reload
- Clique `Reload` dans l'onglet Web.
- Teste: `https://<ton-username>.pythonanywhere.com`

## Notes
- Le frontend appelle automatiquement `window.location.origin/api` en hebergement (deja configure dans `gestion/static/js/api.js`).
- En local `file://`, l'API reste `http://localhost:8000/api`.
