import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import TeamStatus

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(
        email="myuser@example.com",
        password="password",
        first_name="My",
        last_name="User",
        phone_number="+1234567896",
        role="user",
    )


@pytest.fixture
def manager():
    return User.objects.create_user(
        email="mymanager@example.com",
        password="password",
        first_name="My",
        last_name="Manager",
        phone_number="+1234567897",
        role="manager",
    )


@pytest.mark.django_db
class TestMyViews:
    def test_my_today_status_default(self, api_client, user):
        """GET /api/users/me/status/ - User sees default status"""
        api_client.force_authenticate(user=user)
        url = reverse("my-today-status")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "normal"

    def test_my_today_status_with_status(self, api_client, user):
        """GET /api/users/me/status/ - User sees their status"""
        from django.utils import timezone

        api_client.force_authenticate(user=user)
        today = timezone.localdate()
        TeamStatus.objects.create(user=user, date=today, status="late", note="Traffic")

        url = reverse("my-today-status")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "late"
        assert response.data["note"] == "Traffic"

    def test_my_team_as_user(self, api_client, user, manager):
        """GET /api/users/me/team/ - User sees their team"""
        user.manager = manager
        user.save()

        # Create another team member
        teammate = User.objects.create_user(
            email="teammate@example.com",
            password="password",
            first_name="Team",
            last_name="Mate",
            phone_number="+1234567898",
            role="user",
        )
        teammate.manager = manager
        teammate.save()

        api_client.force_authenticate(user=user)
        url = reverse("my-team")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["manager"]["id"] == manager.id
        assert len(response.data["members"]) == 1  # Only teammate, not self
        assert response.data["members"][0]["id"] == teammate.id

    def test_my_team_as_manager(self, api_client, user, manager):
        """GET /api/users/me/team/ - Manager sees their team"""
        user.manager = manager
        user.save()

        api_client.force_authenticate(user=manager)
        url = reverse("my-team")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["manager"]["id"] == manager.id
        assert len(response.data["members"]) == 1
        assert response.data["members"][0]["id"] == user.id
