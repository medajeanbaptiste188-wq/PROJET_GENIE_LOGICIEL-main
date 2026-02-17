from rest_framework import serializers
from .models import Livre, Membre, Emprunt


class LivreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Livre
        fields = [
            'id', 'titre', 'auteur', 'isbn', 'editeur', 'annee', 
            'genre', 'couverture', 'description', 'note', 'total', 'disponible', 
            'emplacement', 'date_ajout', 'date_modification'
        ]
        read_only_fields = ['id', 'date_ajout', 'date_modification']


class MembreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membre
        fields = [
            'id', 'nom', 'email', 'telephone', 'adresse', 
            'statut', 'date_inscription', 'note'
        ]
        read_only_fields = ['id', 'date_inscription']


class EmpruntSerializer(serializers.ModelSerializer):
    livre_titre = serializers.CharField(source='livre.titre', read_only=True)
    membre_nom = serializers.CharField(source='membre.nom', read_only=True)
    
    class Meta:
        model = Emprunt
        fields = [
            'id', 'livre', 'livre_titre', 'membre', 'membre_nom',
            'date_emprunt', 'date_retour_prevue', 'date_retour_effective',
            'statut', 'nombre_jours_retard', 'amende', 'notes'
        ]
        read_only_fields = ['id', 'date_emprunt', 'nombre_jours_retard']
