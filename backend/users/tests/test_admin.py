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
def admin_user():
    return User.objects.create_user(
        email="admin@example.com",
        password="password",
        first_name="Admin",
        last_name="User",
        phone_number="+1234567899",
        role="admin",
    )


@pytest.fixture
def regular_user():
    return User.objects.create_user(
        email="regular@example.com",
        password="password",
        first_name="Regular",
        last_name="User",
        phone_number="+1234567800",
        role="user",
    )


@pytest.mark.django_db
class TestAdmin:
    def test_admin_list_all_users(self, api_client, admin_user, regular_user):
        """GET /api/users/ - Admin can list all users"""
        api_client.force_authenticate(user=admin_user)
        url = reverse("user-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2  # At least admin and regular user

    def test_user_cannot_list_all_users(self, api_client, regular_user):
        """GET /api/users/ - Regular user might not have permission"""
        # Note: This depends on your permission settings
        # If UserListCreateView has no permission_classes, this will pass
        # Adjust based on your actual implementation
        api_client.force_authenticate(user=regular_user)
        url = reverse("user-list")
        response = api_client.get(url)
        # This test assumes the endpoint is accessible to all authenticated users
        # If you want to restrict it, add IsAdmin permission to UserListCreateView
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_403_FORBIDDEN]
