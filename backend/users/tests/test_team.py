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
        first_name="Manager",
        last_name="Boss",
        phone_number="+1234567893",
        role="manager",
    )


@pytest.fixture
def employee():
    return User.objects.create_user(
        email="employee@example.com",
        password="password",
        first_name="Emp",
        last_name="Loyee",
        phone_number="+1234567894",
        role="user",
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
        response = api_client.put(url, {"user_id": employee.id, "manager_id": manager.id})
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.manager == manager

    def test_set_status(self, api_client, manager, employee):
        # Assign employee to manager first
        employee.manager = manager
        employee.save()

        api_client.force_authenticate(user=manager)
        url = reverse("team-status-set")
        response = api_client.post(url, {"user_id": employee.id, "status": "late", "note": "Traffic"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "late"

    def test_manager_view_team_member_entries(self, api_client, manager, employee):
        """GET /api/users/team/members/<user_id>/time-entries/ - Manager views employee time entries"""
        from users.models import TimeEntry
        from django.utils import timezone

        employee.manager = manager
        employee.save()

        # Create time entries for employee
        TimeEntry.objects.create(user=employee, clock_in=timezone.now())

        api_client.force_authenticate(user=manager)
        url = reverse("team-member-entries", kwargs={"user_id": employee.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_manager_fix_time_entry(self, api_client, manager, employee):
        """POST /api/users/team/time-entry/ - Manager creates/fixes time entry"""
        from django.utils import timezone
        from users.models import TimeEntry

        employee.manager = manager
        employee.save()

        api_client.force_authenticate(user=manager)
        url = reverse("team-time-entry-upsert")
        clock_in_time = timezone.now().isoformat()
        response = api_client.post(url, {"user_id": employee.id, "clock_in": clock_in_time})
        assert response.status_code == status.HTTP_200_OK
        # Verify time entry was created
        assert TimeEntry.objects.filter(user=employee).count() == 1
