import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import Team

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
        # Admin assigning employee to a team
        # Create admin user
        admin = User.objects.create_user(
            email="admin@example.com",
            password="password",
            first_name="Admin",
            last_name="User",
            phone_number="+1234567899",
            role="admin",
        )
        team = Team.objects.create(name="Admin Team", created_by=admin)

        api_client.force_authenticate(user=admin)
        url = reverse("admin-assign-team")
        response = api_client.put(url, {"user_id": employee.id, "team_id": team.id})
        assert response.status_code == status.HTTP_200_OK
        employee.refresh_from_db()
        assert employee.team == team

    def test_set_status(self, api_client, manager, employee):
        # Assign employee to manager's team first
        team = Team.objects.create(name="Status Team", created_by=manager)
        employee.team = team
        employee.save()
        manager.team = team
        manager.save()

        api_client.force_authenticate(user=manager)
        url = reverse("team-status-set")
        response = api_client.post(url, {"user_id": employee.id, "status": "late", "note": "Traffic"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "late"

    def test_manager_view_team_member_entries(self, api_client, manager, employee):
        """GET /api/users/team/members/<user_id>/time-entries/ - Manager views employee time entries"""
        from django.utils import timezone

        from users.models import TimeEntry

        # Assign employee to manager's team
        team = Team.objects.create(name="Time Entry Team", created_by=manager)
        employee.team = team
        employee.save()
        manager.team = team
        manager.save()

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

        # Assign employee to manager's team
        team = Team.objects.create(name="Fix Entry Team", created_by=manager)
        employee.team = team
        employee.save()
        manager.team = team
        manager.save()

        api_client.force_authenticate(user=manager)
        url = reverse("team-time-entry-upsert")
        clock_in_time = timezone.now().isoformat()
        response = api_client.post(url, {"user_id": employee.id, "clock_in": clock_in_time})
        assert response.status_code == status.HTTP_200_OK
        # Verify time entry was created
        assert TimeEntry.objects.filter(user=employee).count() == 1

    def test_manager_get_working_hours(self, api_client, manager, employee):
        """GET /api/users/team/members/<user_id>/working-hours/ - Manager views working hours"""
        from users.models import WorkingHours

        # Assign employee to manager's team
        team = Team.objects.create(name="Hours Team", created_by=manager)
        employee.team = team
        employee.save()
        manager.team = team
        manager.save()

        # Create working hours for employee
        WorkingHours.objects.create(user=employee, day_of_week=0, start_time="09:00", end_time="17:00")
        WorkingHours.objects.create(user=employee, day_of_week=1, start_time="09:00", end_time="17:00")

        api_client.force_authenticate(user=manager)
        url = reverse("working-hours", kwargs={"user_id": employee.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_manager_set_working_hours(self, api_client, manager, employee):
        """PUT /api/users/team/members/<user_id>/working-hours/ - Manager sets working hours"""
        # Assign employee to manager's team
        team = Team.objects.create(name="Set Hours Team", created_by=manager)
        employee.team = team
        employee.save()
        manager.team = team
        manager.save()

        api_client.force_authenticate(user=manager)
        url = reverse("working-hours", kwargs={"user_id": employee.id})
        schedules = [
            {"day_of_week": 0, "start_time": "09:00", "end_time": "17:00"},
            {"day_of_week": 1, "start_time": "09:00", "end_time": "17:00"},
            {"day_of_week": 2, "start_time": "10:00", "end_time": "18:00"},
        ]
        response = api_client.put(url, {"schedules": schedules}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

        from users.models import WorkingHours
        assert WorkingHours.objects.filter(user=employee).count() == 3

    def test_manager_cannot_set_hours_for_non_team_member(self, api_client, manager, employee):
        """Manager cannot set working hours for user not in their team"""
        team1 = Team.objects.create(name="Manager Team", created_by=manager)
        team2 = Team.objects.create(name="Other Team", created_by=manager)
        manager.team = team1
        manager.save()
        employee.team = team2
        employee.save()

        api_client.force_authenticate(user=manager)
        url = reverse("working-hours", kwargs={"user_id": employee.id})
        response = api_client.put(url, {"schedules": []}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN
