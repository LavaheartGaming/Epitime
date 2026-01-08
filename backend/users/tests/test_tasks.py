import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from users.models import Task, Team

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(
        email="taskuser@example.com",
        password="password",
        first_name="Task",
        last_name="User",
        phone_number="+1234567891",
        role="user",
    )


@pytest.fixture
def manager():
    return User.objects.create_user(
        email="taskmanager@example.com",
        password="password",
        first_name="Task",
        last_name="Manager",
        phone_number="+1234567892",
        role="manager",
    )


@pytest.mark.django_db
class TestTasks:
    def test_create_task_self(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("task-list-create")
        response = api_client.post(url, {"title": "My Task", "priority": "medium", "estimated_duration": 2})
        assert response.status_code == status.HTTP_201_CREATED
        assert Task.objects.count() == 1
        assert Task.objects.get().assigned_to == user

    def test_manager_assign_task(self, api_client, manager, user):
        # Create a team and assign users to it
        team = Team.objects.create(name="Task Team", created_by=manager)
        user.team = team
        user.save()
        manager.team = team
        manager.save()

        api_client.force_authenticate(user=manager)
        url = reverse("task-list-create")
        response = api_client.post(url, {"title": "Team Task", "priority": "high", "assigned_to": user.id})
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get()
        assert task.assigned_to == user
        assert task.created_by == manager

    def test_list_tasks(self, api_client, user):
        api_client.force_authenticate(user=user)
        Task.objects.create(title="Task 1", created_by=user, assigned_to=user)

        url = reverse("task-list-create")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["title"] == "Task 1"

    def test_get_task_detail(self, api_client, user):
        """GET /api/users/tasks/<pk>/ - User can view their task"""
        api_client.force_authenticate(user=user)
        task = Task.objects.create(title="My Task", created_by=user, assigned_to=user, priority="high")

        url = reverse("task-detail", kwargs={"pk": task.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "My Task"
        assert response.data["priority"] == "high"

    def test_update_task(self, api_client, user):
        """PUT /api/users/tasks/<pk>/ - User can update their task"""
        api_client.force_authenticate(user=user)
        task = Task.objects.create(title="Old Title", created_by=user, assigned_to=user, priority="low")

        url = reverse("task-detail", kwargs={"pk": task.pk})
        response = api_client.put(url, {"title": "New Title", "priority": "high", "progress": 50})
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.title == "New Title"
        assert task.priority == "high"
        assert task.progress == 50

    def test_delete_task(self, api_client, user):
        """DELETE /api/users/tasks/<pk>/ - User can delete their task"""
        api_client.force_authenticate(user=user)
        task = Task.objects.create(title="To Delete", created_by=user, assigned_to=user)

        url = reverse("task-detail", kwargs={"pk": task.pk})
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_200_OK
        assert Task.objects.count() == 0

    def test_task_access_denied(self, api_client, user, manager):
        """GET /api/users/tasks/<pk>/ - User cannot access another user's task"""
        api_client.force_authenticate(user=user)
        # Create a task belonging to manager
        other_task = Task.objects.create(title="Manager Task", created_by=manager, assigned_to=manager)

        url = reverse("task-detail", kwargs={"pk": other_task.pk})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
