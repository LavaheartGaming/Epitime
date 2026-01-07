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
def manager():
    return User.objects.create_user(
        email="manager@example.com",
        password="password",
        role="manager",
        first_name="Manager",
        last_name="Boss"
    )

@pytest.fixture
def employee():
    return User.objects.create_user(
        email="employee@example.com",
        password="password",
        role="user",
        first_name="Emp",
        last_name="Loyee"
    )

@pytest.mark.django_db
class TestTeam:
    def test_manager_access_denied_for_user(self, api_client, employee):
        api_client.force_authenticate(user=employee)
        url = reverse("team-members")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_manager_can_list_team(self, api_client, manager):
        api_client.force_authenticate(user=manager)
        url = reverse("team-members")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_assign_manager_self(self, api_client, manager, employee):
        # Manager assigning employee to themselves
        api_client.force_authenticate(user=manager)
        url = reverse("admin-assign-manager")
        response = api_client.put(url, {
            "user_id": employee.id,
            "manager_id": manager.id
        })
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.manager == manager

    def test_set_status(self, api_client, manager, employee):
        # Assign employee to manager first
        employee.manager = manager
        employee.save()
        
        api_client.force_authenticate(user=manager)
        url = reverse("team-status-set")
        response = api_client.post(url, {
            "user_id": employee.id,
            "status": "late",
            "note": "Traffic"
        })
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "late"
