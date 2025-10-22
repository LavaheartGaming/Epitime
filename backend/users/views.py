from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer

from django_otp.oath import TOTP
from django_otp.util import random_hex
import time


# === Liste et création des utilisateurs ===
class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


# === Inscription ===
class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "✅ User registered successfully!"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# === Connexion ===
class LoginView(APIView):
    def post(self, request):
        print("=== DEBUG LOGIN ===")
        print(request.data)
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "❌ Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({"error": "❌ Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "✅ Login successful",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "phone_number": user.phone_number,
                "two_factor_enabled": user.two_factor_enabled,
            },
        }, status=status.HTTP_200_OK)


# === Mise à jour du profil ===
class UpdateUserView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# === Changement de mot de passe ===
class ChangePasswordView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not old_password or not new_password or not confirm_password:
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "❌ Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"error": "⚠️ Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "✅ Password changed successfully!"}, status=status.HTTP_200_OK)


# === Suppression du compte ===
class DeleteAccountView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "✅ Account deleted successfully."}, status=200)


# === Activation de la double authentification (2FA) ===
class Enable2FAView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if not hasattr(user, "otp_secret") or not user.otp_secret:
            user.otp_secret = random_hex(20)
            user.save()

        otp = TOTP(user.otp_secret)
        otp.time = int(time.time()) // 30
        code = otp.token()

        return Response({
            "message": "2FA setup initiated",
            "otp_secret": user.otp_secret,
            "example_code": code
        })


# === Vérification du code 2FA ===
class Verify2FAView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        code = request.data.get("code")
        if not code:
            return Response({"error": "Code required"}, status=400)

        otp = TOTP(user.otp_secret)
        otp.time = int(time.time()) // 30
        if otp.token() == code:
            user.two_factor_enabled = True
            user.save()
            return Response({"message": "✅ 2FA activated successfully"})
        return Response({"error": "❌ Invalid 2FA code"}, status=400)
