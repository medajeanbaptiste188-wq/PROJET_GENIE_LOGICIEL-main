from django.contrib import admin
from .models import Livre, Membre, Emprunt


@admin.register(Livre)
class LivreAdmin(admin.ModelAdmin):
    list_display = ['titre', 'auteur', 'isbn', 'genre', 'disponible', 'total', 'note', 'date_ajout']
    list_filter = ['genre', 'date_ajout', 'annee']
    search_fields = ['titre', 'auteur', 'isbn']
    readonly_fields = ['date_ajout', 'date_modification']
    
    fieldsets = (
        ('Informations', {
            'fields': ('titre', 'auteur', 'isbn', 'editeur', 'annee', 'genre')
        }),
        ('Exemplaires', {
            'fields': ('total', 'disponible')
        }),
        ('Détails', {
            'fields': ('description', 'note', 'emplacement')
        }),
        ('Dates', {
            'fields': ('date_ajout', 'date_modification'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Membre)
class MembreAdmin(admin.ModelAdmin):
    list_display = ['nom', 'email', 'telephone', 'statut', 'date_inscription']
    list_filter = ['statut', 'date_inscription']
    search_fields = ['nom', 'email', 'telephone']
    readonly_fields = ['date_inscription', 'date_modification']
    
    fieldsets = (
        ('Informations personnelles', {
            'fields': ('nom', 'email', 'telephone', 'adresse')
        }),
        ('Statut', {
            'fields': ('statut', 'note')
        }),
        ('Dates', {
            'fields': ('date_inscription', 'date_modification'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Emprunt)
class EmpruntAdmin(admin.ModelAdmin):
    list_display = ['livre', 'membre', 'date_emprunt', 'date_retour_prevue', 'statut', 'nombre_jours_retard']
    list_filter = ['statut', 'date_emprunt', 'date_retour_prevue']
    search_fields = ['livre__titre', 'membre__nom']
    readonly_fields = ['date_emprunt', 'nombre_jours_retard']
    
    fieldsets = (
        ('Emprunteur et Livre', {
            'fields': ('livre', 'membre')
        }),
        ('Dates', {
            'fields': ('date_emprunt', 'date_retour_prevue', 'date_retour_effective')
        }),
        ('Statut', {
            'fields': ('statut', 'nombre_jours_retard', 'amende', 'notes')
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # En édition
            return self.readonly_fields + ['livre', 'membre', 'date_emprunt']
        return self.readonly_fields
