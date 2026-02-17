from django import forms
from .models import Livre, Membre, Emprunt


class LivreForm(forms.ModelForm):
    class Meta:
        model = Livre
        fields = ['titre', 'auteur', 'isbn', 'editeur', 'annee', 'genre', 
                  'description', 'note', 'total', 'emplacement']
        widgets = {
            'titre': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Titre du livre'}),
            'auteur': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Auteur'}),
            'isbn': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ISBN'}),
            'editeur': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Éditeur'}),
            'annee': forms.NumberInput(attrs={'class': 'form-control', 'placeholder': 'Année'}),
            'genre': forms.Select(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'note': forms.NumberInput(attrs={'class': 'form-control', 'min': 0, 'max': 5, 'step': 0.1}),
            'total': forms.NumberInput(attrs={'class': 'form-control', 'min': 1}),
            'emplacement': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Étagère A1'}),
        }


class MembreForm(forms.ModelForm):
    class Meta:
        model = Membre
        fields = ['nom', 'email', 'telephone', 'adresse', 'statut', 'note']
        widgets = {
            'nom': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nom complet'}),
            'email': forms.EmailInput(attrs={'class': 'form-control', 'placeholder': 'Email'}),
            'telephone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Téléphone'}),
            'adresse': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'statut': forms.Select(attrs={'class': 'form-control'}),
            'note': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
        }


class EmpruntForm(forms.ModelForm):
    class Meta:
        model = Emprunt
        fields = ['livre', 'membre', 'date_retour_prevue', 'notes']
        widgets = {
            'livre': forms.Select(attrs={'class': 'form-control'}),
            'membre': forms.Select(attrs={'class': 'form-control'}),
            'date_retour_prevue': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
        }


class RetournerLivreForm(forms.ModelForm):
    class Meta:
        model = Emprunt
        fields = ['date_retour_effective', 'notes']
        widgets = {
            'date_retour_effective': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'notes': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
        }
