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

## 4) Configurer le fichier WSGI
Dans `Web` > clique sur le lien du fichier WSGI et ajoute:

pour générer la clé django : ```bash python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" ```

```bash
import os
import sys

path = '/home/JeanBaptiste/PROJET_GENIE_LOGICIEL-main/bibliotheque_django'
if path not in sys.path:
    sys.path.append(path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

os.environ['DJANGO_SECRET_KEY'] = 'fj0#nl$1@27n5hh(kxv8u8ava1w_x9vk%rpv@gg5krpf^ga1)2'(METS_ICI_TA_CLE_SECRETE_GENERER)
os.environ['DJANGO_DEBUG'] = 'False'
os.environ['DJANGO_ALLOWED_HOSTS'] = 'JeanBaptiste.pythonanywhere.com'
os.environ['DJANGO_CSRF_TRUSTED_ORIGINS'] = 'https://JeanBaptiste.pythonanywhere.com'
os.environ['DJANGO_CORS_ALLOWED_ORIGINS'] = 'https://JeanBaptiste.pythonanywhere.com'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application() 
```

## 5) Migration + static
```bash
cd ~/PROJET_GENIE_LOGICIEL-main/bibliotheque_django
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
```

## 6) Configurer static/media (onglet Web)
- Static URL: `/static/`
- Static Directory: `/home/<ton-username>/PROJET_GENIE_LOGICIEL-main/bibliotheque_django/staticfiles`

- Media URL: `/media/`
- Media Directory: `/home/<ton-username>/PROJET_GENIE_LOGICIEL-main/bibliotheque_django/media`

## 7) Reload
- Clique `Reload` dans l'onglet Web.
- Teste: `https://<ton-username>.pythonanywhere.com`

## Notes
- Le frontend appelle automatiquement `window.location.origin/api` en hebergement (deja configure dans `gestion/static/js/api.js`).
- En local `file://`, l'API reste `http://localhost:8000/api`.

## si un fichier css/js a été modifier tape cette commande dans bash : 
```bash
cd ~/PROJET_GENIE_LOGICIEL-main/bibliotheque_django
source .venv/bin/activate
python manage.py collectstatic --noinput 
```

-Si la version de ton python .venv est différente de la version de ton site 
cd ~/PROJET_GENIE_LOGICIEL-main/bibliotheque_django
rm -rf .venv
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

Virtualenv = /home/JeanBaptiste/PROJET_GENIE_LOGICIEL-main/bibliotheque_django/.venv