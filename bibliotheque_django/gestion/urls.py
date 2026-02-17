from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter
from .views import LivreViewSet, MembreViewSet, EmpruntViewSet

router = DefaultRouter()
router.register(r'livres', LivreViewSet, basename='livre')
router.register(r'membres', MembreViewSet, basename='membre')
router.register(r'emprunts', EmpruntViewSet, basename='emprunt')

urlpatterns = [
    # Pages HTML
    path('', TemplateView.as_view(template_name='index.html'), name='index'),
    path('dashboard.html', TemplateView.as_view(template_name='dashboard.html'), name='dashboard'),
    path('livres.html', TemplateView.as_view(template_name='livres.html'), name='livres'),
    path('membres.html', TemplateView.as_view(template_name='membres.html'), name='membres'),
    path('emprunts.html', TemplateView.as_view(template_name='emprunts.html'), name='emprunts'),
    path('parametres.html', TemplateView.as_view(template_name='parametres.html'), name='parametres'),
    path('ajouter-livre.html', TemplateView.as_view(template_name='ajouter-livre.html'), name='ajouter-livre'),
    path('modifier-livre.html', TemplateView.as_view(template_name='modifier-livre.html'), name='modifier-livre'),
    path('supprimer-livre.html', TemplateView.as_view(template_name='supprimer-livre.html'), name='supprimer-livre'),
    path('ajouter-membre.html', TemplateView.as_view(template_name='ajouter-membre.html'), name='ajouter-membre'),
    path('modifier-membre.html', TemplateView.as_view(template_name='modifier-membre.html'), name='modifier-membre'),
    path('supprimer-membre.html', TemplateView.as_view(template_name='supprimer-membre.html'), name='supprimer-membre'),
    path('ajouter-emprunt.html', TemplateView.as_view(template_name='ajouter-emprunt.html'), name='ajouter-emprunt'),
    path('modifier-emprunt.html', TemplateView.as_view(template_name='modifier-emprunt.html'), name='modifier-emprunt'),
    path('confirmer-emprunt.html', TemplateView.as_view(template_name='confirmer-emprunt.html'), name='confirmer-emprunt'),
    
    # API REST
    path('api/', include(router.urls)),
]
