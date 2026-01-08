import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import TimeEntry

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(
        email="worker@example.com",
        password="password",
        first_name="Worker",
        last_name="One",
        phone_number="+1234567890",
    )


@pytest.mark.django_db
class TestClock:
    def test_clock_in(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("clock-in")
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert TimeEntry.objects.filter(user=user, clock_out__isnull=True).exists()

    def test_clock_in_twice_fails(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("clock-in")
        api_client.post(url)  # First clock in
        response = api_client.post(url)  # Second attempt
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already clocked in" in response.data["error"]

    def test_clock_out(self, api_client, user):
        api_client.force_authenticate(user=user)
        # Clock in first
        api_client.post(reverse("clock-in"))

        url = reverse("clock-out")
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK

        entry = TimeEntry.objects.get(user=user)
        assert entry.clock_out is not None
        assert entry.total_hours is not None

    def test_clock_out_without_clock_in(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("clock-out")
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_time_entries(self, api_client, user):
        api_client.force_authenticate(user=user)
        # Create some entries
        api_client.post(reverse("clock-in"))
        api_client.post(reverse("clock-out"))

        url = reverse("time-entries")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
