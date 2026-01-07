import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user_data():
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "first_name": "Test",
        "last_name": "User",
        "phone_number": "+1234567890"
    }

@pytest.fixture
def create_user(user_data):
    return User.objects.create_user(**user_data)

@pytest.mark.django_db
class TestAuth:
    def test_register_user(self, api_client, user_data):
        url = reverse("register")
        response = api_client.post(url, user_data)
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.count() == 1
        assert User.objects.get().email == user_data["email"]

    def test_register_duplicate_email(self, api_client, create_user, user_data):
        url = reverse("register")
        response = api_client.post(url, user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_success(self, api_client, create_user, user_data):
        url = reverse("login")
        response = api_client.post(url, {
            "email": user_data["email"],
            "password": user_data["password"]
        })
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_login_invalid_credentials(self, api_client, create_user, user_data):
        url = reverse("login")
        response = api_client.post(url, {
            "email": user_data["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password(self, api_client, create_user, user_data):
        api_client.force_authenticate(user=create_user)
        url = reverse("change-password")
        response = api_client.put(url, {
            "old_password": user_data["password"],
            "new_password": "newpassword123",
            "confirm_password": "newpassword123"
        })
        assert response.status_code == status.HTTP_200_OK
        
        # Verify login with new password
        create_user.refresh_from_db()
        assert create_user.check_password("newpassword123")

    def test_delete_account(self, api_client, create_user):
        api_client.force_authenticate(user=create_user)
        url = reverse("delete-account")
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert User.objects.count() == 0


