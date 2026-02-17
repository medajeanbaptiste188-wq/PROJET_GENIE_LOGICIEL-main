from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, F
from .models import Livre, Membre, Emprunt
from .serializers import LivreSerializer, MembreSerializer, EmpruntSerializer


class LivreViewSet(viewsets.ModelViewSet):
    queryset = Livre.objects.all()
    serializer_class = LivreSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titre', 'auteur', 'isbn', 'genre']
    ordering_fields = ['titre', 'date_ajout', 'disponible']
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """Retourne les livres disponibles"""
        livres = self.queryset.filter(disponible__gt=0)
        serializer = self.get_serializer(livres, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def empruntes(self, request):
        """Retourne les livres empruntes"""
        livres = self.queryset.filter(disponible__lt=F('total'))
        serializer = self.get_serializer(livres, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def ajouter_exemplaire(self, request, pk=None):
        """Ajouter un exemplaire d'un livre"""
        livre = self.get_object()
        livre.total += 1
        livre.disponible += 1
        livre.save()
        serializer = self.get_serializer(livre)
        return Response(serializer.data)


class MembreViewSet(viewsets.ModelViewSet):
    queryset = Membre.objects.all()
    serializer_class = MembreSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'email', 'telephone']
    ordering_fields = ['nom', 'date_inscription', 'statut']
    
    @action(detail=False, methods=['get'])
    def actifs(self, request):
        """Retourne les membres actifs"""
        membres = self.queryset.filter(statut='Actif')
        serializer = self.get_serializer(membres, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def emprunts_actuels(self, request, pk=None):
        """Retourne les emprunts actuels d'un membre"""
        membre = self.get_object()
        emprunts = membre.emprunts.filter(statut__in=['en_cours', 'retard'])
        serializer = EmpruntSerializer(emprunts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def suspendre(self, request, pk=None):
        """Suspendre un membre"""
        membre = self.get_object()
        membre.statut = 'Suspendu'
        membre.save()
        serializer = self.get_serializer(membre)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reactiver(self, request, pk=None):
        """Réactiver un membre"""
        membre = self.get_object()
        membre.statut = 'Actif'
        membre.save()
        serializer = self.get_serializer(membre)
        return Response(serializer.data)


class EmpruntViewSet(viewsets.ModelViewSet):
    queryset = Emprunt.objects.all()
    serializer_class = EmpruntSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['livre__titre', 'membre__nom', 'statut']
    ordering_fields = ['date_emprunt', 'date_retour_prevue', 'statut']
    
    @action(detail=False, methods=['get'])
    def en_cours(self, request):
        """Retourne les emprunts en cours"""
        emprunts = self.queryset.filter(statut='en_cours')
        serializer = self.get_serializer(emprunts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def en_retard(self, request):
        """Retourne les emprunts en retard"""
        emprunts = self.queryset.filter(statut='retard')
        serializer = self.get_serializer(emprunts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def prolonger(self, request, pk=None):
        """Prolonger un emprunt de 7 ou 14 jours"""
        emprunt = self.get_object()
        jours = request.data.get('jours', 7)
        
        if emprunt.statut == 'retourne':
            return Response(
                {'error': 'Impossible de prolonger un emprunt retourné'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        emprunt.date_retour_prevue = emprunt.date_retour_prevue + timezone.timedelta(days=jours)
        emprunt.save()
        serializer = self.get_serializer(emprunt)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def retourner(self, request, pk=None):
        """Retourner un livre"""
        emprunt = self.get_object()
        
        if emprunt.statut == 'retourne':
            return Response(
                {'error': 'Ce livre a déjà été retourné'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        emprunt.date_retour_effective = timezone.now().date()
        emprunt.statut = 'retourne'
        emprunt.livre.disponible += 1
        emprunt.livre.save()
        emprunt.save()
        
        serializer = self.get_serializer(emprunt)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Retourne les statistiques des emprunts"""
        total_emprunts = self.queryset.count()
        en_cours = self.queryset.filter(statut='en_cours').count()
        en_retard = self.queryset.filter(statut='retard').count()
        retournes = self.queryset.filter(statut='retourne').count()
        
        return Response({
            'total_emprunts': total_emprunts,
            'en_cours': en_cours,
            'en_retard': en_retard,
            'retournes': retournes
        })
