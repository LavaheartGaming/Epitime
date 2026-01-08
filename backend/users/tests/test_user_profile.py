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
def user():
    return User.objects.create_user(
        email="profileuser@example.com",
        password="password",
        first_name="Profile",
        last_name="User",
        phone_number="+1234567895",
        role="user",
    )


@pytest.mark.django_db
class TestUserProfile:
    def test_update_user_profile(self, api_client, user):
        """PUT /api/users/update/ - User can update their profile"""
        api_client.force_authenticate(user=user)
        url = reverse("update")
        response = api_client.put(
            url, {"first_name": "UpdatedName", "last_name": "UpdatedLastName", "phone_number": "+9876543210"}
        )
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "UpdatedName"
        assert user.last_name == "UpdatedLastName"
        assert user.phone_number == "+9876543210"

    def test_update_user_profile_partial(self, api_client, user):
        """PUT /api/users/update/ - Partial update works"""
        api_client.force_authenticate(user=user)
        url = reverse("update")
        response = api_client.put(url, {"first_name": "OnlyFirstName"})
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "OnlyFirstName"
        assert user.last_name == "User"  # Unchanged

    def test_update_user_profile_unauthorized(self, api_client):
        """PUT /api/users/update/ - Requires authentication"""
        url = reverse("update")
        response = api_client.put(url, {"first_name": "Hacker"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
