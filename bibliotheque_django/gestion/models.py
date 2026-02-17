from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

class Livre(models.Model):
    GENRE_CHOICES = [
        ('Romans', 'Romans'),
        ('Sciences', 'Sciences'),
        ('Histoire', 'Histoire'),
        ('BD', 'BD'),
        ('Jeunesse', 'Jeunesse'),
        ('Autre', 'Autre'),
    ]
    
    titre = models.CharField(max_length=200)
    auteur = models.CharField(max_length=200)
    isbn = models.CharField(max_length=13, unique=True)
    editeur = models.CharField(max_length=200)
    annee = models.IntegerField(validators=[MinValueValidator(1000), MaxValueValidator(9999)])
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES)
    couverture = models.ImageField(upload_to='livres/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    note = models.FloatField(default=0, validators=[MinValueValidator(0), MaxValueValidator(5)])
    total = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    disponible = models.IntegerField(default=1, validators=[MinValueValidator(0)])
    emplacement = models.CharField(max_length=100, blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date_ajout']
        verbose_name_plural = "Livres"
    
    def __str__(self):
        return f"{self.titre} - {self.auteur}"


class Membre(models.Model):
    STATUT_CHOICES = [
        ('Actif', 'Actif'),
        ('Suspendu', 'Suspendu'),
        ('Inactif', 'Inactif'),
    ]
    
    nom = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20)
    adresse = models.TextField(blank=True, null=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='Actif')
    date_inscription = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    note = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-date_inscription']
        verbose_name_plural = "Membres"
    
    def __str__(self):
        return self.nom


class Emprunt(models.Model):
    STATUT_CHOICES = [
        ('en_cours', 'En cours'),
        ('retard', 'En retard'),
        ('retourne', 'Retourné'),
        ('perdu', 'Perdu'),
    ]
    
    livre = models.ForeignKey(Livre, on_delete=models.CASCADE, related_name='emprunts')
    membre = models.ForeignKey(Membre, on_delete=models.CASCADE, related_name='emprunts')
    date_emprunt = models.DateTimeField(auto_now_add=True)
    date_retour_prevue = models.DateField()
    date_retour_effective = models.DateField(blank=True, null=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_cours')
    nombre_jours_retard = models.IntegerField(default=0)
    amende = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-date_emprunt']
        verbose_name_plural = "Emprunts"
    
    def __str__(self):
        return f"{self.livre.titre} - {self.membre.nom} ({self.date_emprunt.date()})"
    
    def save(self, *args, **kwargs):
        # Vérifier les retards
        if self.statut == 'en_cours' and timezone.now().date() > self.date_retour_prevue:
            self.statut = 'retard'
            jours_retard = (timezone.now().date() - self.date_retour_prevue).days
            self.nombre_jours_retard = jours_retard
        super().save(*args, **kwargs)
