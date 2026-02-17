import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000/api"

# ===== EXEMPLES D'UTILISATION DE L'API REST =====

# 1. LIVRES
# ---------

# Ajouter un livre
def ajouter_livre():
    livre_data = {
        "titre": "Le Seigneur des Anneaux",
        "auteur": "J.R.R. Tolkien",
        "isbn": "9782253048822",
        "editeur": "Poche",
        "annee": 1954,
        "genre": "Romans",
        "description": "Une épopée fantastique",
        "note": 4.9,
        "total": 5,
        "emplacement": "Étagère D1"
    }
    response = requests.post(f"{BASE_URL}/livres/", json=livre_data)
    print("Livre ajouté:", response.json())
    return response.json()

# Récupérer tous les livres
def get_livres():
    response = requests.get(f"{BASE_URL}/livres/")
    print("Livres:", response.json())
    return response.json()

# Récupérer les livres disponibles
def get_livres_disponibles():
    response = requests.get(f"{BASE_URL}/livres/disponibles/")
    print("Livres disponibles:", response.json())
    return response.json()

# 2. MEMBRES
# ----------

# Ajouter un membre
def ajouter_membre():
    membre_data = {
        "nom": "Claude Dupont",
        "email": "claude.dupont@email.com",
        "telephone": "0612345678",
        "adresse": "123 Rue de Main, 75000 Paris",
        "statut": "Actif"
    }
    response = requests.post(f"{BASE_URL}/membres/", json=membre_data)
    print("Membre ajouté:", response.json())
    return response.json()

# Récupérer tous les membres
def get_membres():
    response = requests.get(f"{BASE_URL}/membres/")
    print("Membres:", response.json())
    return response.json()

# Filtrer les membres actifs
def get_membres_actifs():
    response = requests.get(f"{BASE_URL}/membres/actifs/")
    print("Membres actifs:", response.json())
    return response.json()

# 3. EMPRUNTS
# -----------

# Créer un emprunt
def creer_emprunt(livre_id, membre_id):
    date_retour = (datetime.now() + timedelta(days=14)).date()
    emprunt_data = {
        "livre": livre_id,
        "membre": membre_id,
        "date_retour_prevue": str(date_retour),
        "notes": "Première lecture"
    }
    response = requests.post(f"{BASE_URL}/emprunts/", json=emprunt_data)
    print("Emprunt créé:", response.json())
    return response.json()

# Récupérer les emprunts en cours
def get_emprunts_en_cours():
    response = requests.get(f"{BASE_URL}/emprunts/en_cours/")
    print("Emprunts en cours:", response.json())
    return response.json()

# Prolonger un emprunt
def prolonger_emprunt(emprunt_id, jours=7):
    data = {"jours": jours}
    response = requests.post(f"{BASE_URL}/emprunts/{emprunt_id}/prolonger/", json=data)
    print("Emprunt prolongé:", response.json())
    return response.json()

# Retourner un livre
def retourner_livre(emprunt_id):
    response = requests.post(f"{BASE_URL}/emprunts/{emprunt_id}/retourner/")
    print("Livre retourné:", response.json())
    return response.json()

# Récupérer les statistiques
def get_statistiques_emprunts():
    response = requests.get(f"{BASE_URL}/emprunts/statistiques/")
    print("Statistiques:", response.json())
    return response.json()

# 4. RECHERCHE ET FILTRAGE
# -------------------------

# Rechercher des livres
def search_livres(query):
    response = requests.get(f"{BASE_URL}/livres/?search={query}")
    print("Résultats recherche:", response.json())
    return response.json()

# Filtrer les emprunts en retard
def get_emprunts_retard():
    response = requests.get(f"{BASE_URL}/emprunts/en_retard/")
    print("Emprunts en retard:", response.json())
    return response.json()

# ===== TESTS =====

if __name__ == "__main__":
    print("=== Test de l'API Rest ===\n")
    
    # Ajouter un livre et un membre
    livre = ajouter_livre()
    membre = ajouter_membre()
    
    # Créer un emprunt
    if livre and membre:
        emprunt = creer_emprunt(livre['id'], membre['id'])
        
        # Prolonger l'emprunt
        if emprunt:
            prolonger_emprunt(emprunt['id'], 7)
    
    # Récupérer les statistiques
    get_statistiques_emprunts()
