from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Livre, Emprunt


@receiver(post_save, sender=Emprunt)
def update_livre_disponible_on_emprunt_create(sender, instance, created, **kwargs):
    """Diminue le nombre de livres disponibles lors de la création d'un emprunt"""
    if created:
        livre = instance.livre
        livre.disponible = max(0, livre.disponible - 1)
        livre.save()


@receiver(post_delete, sender=Emprunt)
def update_livre_disponible_on_emprunt_delete(sender, instance, **kwargs):
    """Augmente le nombre de livres disponibles lors de la suppression d'un emprunt"""
    livre = instance.livre
    livre.disponible = min(livre.total, livre.disponible + 1)
    livre.save()
