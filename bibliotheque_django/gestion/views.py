from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.utils import timezone
from django.db.models import F
from django.db.models import Q
import os
from .models import Livre, Membre, Emprunt
from .serializers import LivreSerializer, MembreSerializer, EmpruntSerializer


@ensure_csrf_cookie
def csrf_token_view(request):
    """Expose le token CSRF et force le cookie côté client."""
    return JsonResponse({'csrfToken': get_token(request)})


User = get_user_model()
BIBLIO_ACCESS_CODE = os.getenv('BIBLIO_ACCESS_CODE', '12345JeaN')


def login_api(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    import json
    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        payload = {}
    identifier = (payload.get('identifier') or payload.get('email') or '').strip()
    password = payload.get('password') or ''
    portal = (payload.get('portal') or '').strip().lower()
    access_code = payload.get('access_code') or ''

    if not identifier or not password:
        return JsonResponse({'detail': "Identifiant et mot de passe obligatoires"}, status=400)

    user = authenticate(request, username=identifier, password=password)
    if user is None:
        # Fallback robuste: tester tous les comptes correspondant à username/email (insensible à la casse)
        candidates = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        )
        for candidate in candidates:
            if candidate.check_password(password):
                user = candidate
                # Nécessaire quand on passe hors authenticate(...)
                user.backend = 'django.contrib.auth.backends.ModelBackend'
                break

    if user is None:
        return JsonResponse({'detail': 'Identifiants invalides'}, status=401)

    if portal == 'bibliothecaire' and not user.is_staff:
        return JsonResponse(
            {'detail': "Ce compte n'est pas autorisé dans l'espace bibliothécaire."},
            status=403
        )

    if portal == 'bibliothecaire' and access_code != BIBLIO_ACCESS_CODE:
        return JsonResponse(
            {'detail': "Code d'accès bibliothécaire incorrect."},
            status=403
        )

    if portal == 'utilisateur' and user.is_staff:
        return JsonResponse(
            {'detail': "Ce compte n'est pas autorisé dans l'espace utilisateur."},
            status=403
        )

    login(request, user)
    role = 'bibliothecaire' if user.is_staff else 'utilisateur'
    redirect_url = '/dashboard.html' if user.is_staff else '/espace-utilisateur.html'
    return JsonResponse({
        'id': user.id,
        'email': user.email,
        'nom': (user.get_full_name() or user.username),
        'role': role,
        'redirect_url': redirect_url,
    })


def register_api(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    import json
    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        payload = {}
    nom = (payload.get('nom') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    telephone = (payload.get('telephone') or '').strip()
    adresse = (payload.get('adresse') or '').strip()
    portal = (payload.get('portal') or '').strip().lower()

    if portal != 'utilisateur':
        return JsonResponse(
            {'detail': "La création de compte est autorisée uniquement dans l'espace utilisateur."},
            status=403
        )

    if not nom or not email or not password:
        return JsonResponse({'detail': 'Nom, email et mot de passe sont obligatoires'}, status=400)
    if len(password) < 6:
        return JsonResponse({'detail': 'Le mot de passe doit contenir au moins 6 caractères'}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({'detail': 'Cet email est déjà utilisé'}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=nom,
        is_staff=False,
    )

    Membre.objects.get_or_create(
        email=email,
        defaults={
            'nom': nom,
            'telephone': telephone,
            'adresse': adresse,
            'statut': 'Actif',
        }
    )

    return JsonResponse({
        'id': user.id,
        'email': user.email,
        'nom': user.first_name or user.username,
        'role': 'utilisateur',
        'redirect_url': '/espace-utilisateur.html',
    }, status=201)


def register_bibliothecaire_api(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    import json
    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        payload = {}

    nom = (payload.get('nom') or '').strip()
    email = (payload.get('email') or '').strip().lower()
    password = payload.get('password') or ''
    portal = (payload.get('portal') or '').strip().lower()
    access_code = payload.get('access_code') or ''

    if portal != 'bibliothecaire':
        return JsonResponse({'detail': "Création autorisée uniquement depuis l'espace bibliothécaire."}, status=403)

    if access_code != BIBLIO_ACCESS_CODE:
        return JsonResponse({'detail': "Code d'accès bibliothécaire incorrect."}, status=403)

    if not nom or not email or not password:
        return JsonResponse({'detail': 'Nom, email et mot de passe sont obligatoires'}, status=400)
    if len(password) < 6:
        return JsonResponse({'detail': 'Le mot de passe doit contenir au moins 6 caractères'}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({'detail': 'Cet email est déjà utilisé'}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=nom,
        is_staff=True,
    )

    return JsonResponse({
        'id': user.id,
        'email': user.email,
        'nom': user.first_name or user.username,
        'role': 'bibliothecaire',
        'redirect_url': '/dashboard.html',
    }, status=201)


def logout_api(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)
    logout(request)
    return JsonResponse({'detail': 'Déconnecté'})


def current_user_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'is_authenticated': False}, status=401)
    return JsonResponse({
        'is_authenticated': True,
        'id': request.user.id,
        'email': request.user.email,
        'nom': request.user.get_full_name() or request.user.username,
        'role': 'bibliothecaire' if request.user.is_staff else 'utilisateur',
    })


class LivreViewSet(viewsets.ModelViewSet):
    queryset = Livre.objects.all()
    serializer_class = LivreSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titre', 'auteur', 'isbn', 'genre']
    ordering_fields = ['titre', 'date_ajout', 'disponible']

    def _require_staff(self, request):
        if not request.user.is_staff:
            raise PermissionDenied("Action réservée au bibliothécaire.")

    def perform_create(self, serializer):
        self._require_staff(self.request)
        serializer.save()

    def perform_update(self, serializer):
        self._require_staff(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_staff(self.request)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """Retourne les livres disponibles"""
        livres = self.get_queryset().filter(disponible__gt=0)
        serializer = self.get_serializer(livres, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def empruntes(self, request):
        """Retourne les livres empruntes"""
        livres = self.get_queryset().filter(disponible__lt=F('total'))
        serializer = self.get_serializer(livres, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def ajouter_exemplaire(self, request, pk=None):
        """Ajouter un exemplaire d'un livre"""
        self._require_staff(request)
        livre = self.get_object()
        livre.total += 1
        livre.disponible += 1
        livre.save()
        serializer = self.get_serializer(livre)
        return Response(serializer.data)


class MembreViewSet(viewsets.ModelViewSet):
    queryset = Membre.objects.all()
    serializer_class = MembreSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'email', 'telephone']
    ordering_fields = ['nom', 'date_inscription', 'statut']

    def _require_staff(self, request):
        if not request.user.is_staff:
            raise PermissionDenied("Action réservée au bibliothécaire.")

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset
        # Un utilisateur ne voit que sa propre fiche membre.
        return self.queryset.filter(email__iexact=self.request.user.email)

    def perform_create(self, serializer):
        self._require_staff(self.request)
        serializer.save()

    def perform_update(self, serializer):
        self._require_staff(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_staff(self.request)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def actifs(self, request):
        """Retourne les membres actifs"""
        self._require_staff(request)
        membres = self.get_queryset().filter(statut='Actif')
        serializer = self.get_serializer(membres, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def emprunts_actuels(self, request, pk=None):
        """Retourne les emprunts actuels d'un membre"""
        self._require_staff(request)
        membre = self.get_object()
        emprunts = membre.emprunts.filter(statut__in=['en_cours', 'retard'])
        serializer = EmpruntSerializer(emprunts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def suspendre(self, request, pk=None):
        """Suspendre un membre"""
        self._require_staff(request)
        membre = self.get_object()
        membre.statut = 'Suspendu'
        membre.save()
        serializer = self.get_serializer(membre)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reactiver(self, request, pk=None):
        """Réactiver un membre"""
        self._require_staff(request)
        membre = self.get_object()
        membre.statut = 'Actif'
        membre.save()
        serializer = self.get_serializer(membre)
        return Response(serializer.data)


class EmpruntViewSet(viewsets.ModelViewSet):
    queryset = Emprunt.objects.all()
    serializer_class = EmpruntSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['livre__titre', 'membre__nom', 'statut']
    ordering_fields = ['date_emprunt', 'date_retour_prevue', 'statut']

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(membre__email__iexact=self.request.user.email)

    def _require_staff(self, request):
        if not request.user.is_staff:
            raise PermissionDenied("Action réservée au bibliothécaire.")

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if not request.user.is_staff:
            membre = Membre.objects.filter(email__iexact=request.user.email).first()
            if not membre:
                raise ValidationError("Aucun membre associé à cet utilisateur.")
            payload['membre'] = membre.id

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        self._require_staff(self.request)
        serializer.save()

    def perform_destroy(self, instance):
        self._require_staff(self.request)
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def en_cours(self, request):
        """Retourne les emprunts en cours"""
        emprunts = self.get_queryset().filter(statut='en_cours')
        serializer = self.get_serializer(emprunts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def en_retard(self, request):
        """Retourne les emprunts en retard"""
        emprunts = self.get_queryset().filter(statut='retard')
        serializer = self.get_serializer(emprunts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def prolonger(self, request, pk=None):
        """Prolonger un emprunt de 7 ou 14 jours"""
        self._require_staff(request)
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
        self._require_staff(request)
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
        queryset = self.get_queryset()
        total_emprunts = queryset.count()
        en_cours = queryset.filter(statut='en_cours').count()
        en_retard = queryset.filter(statut='retard').count()
        retournes = queryset.filter(statut='retourne').count()
        
        return Response({
            'total_emprunts': total_emprunts,
            'en_cours': en_cours,
            'en_retard': en_retard,
            'retournes': retournes
        })
