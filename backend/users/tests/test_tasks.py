import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from users.models import Task

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user():
    return User.objects.create_user(
        email="taskuser@example.com",
        password="password",
        role="user"
    )

@pytest.fixture
def manager():
    return User.objects.create_user(
        email="taskmanager@example.com",
        password="password",
        role="manager"
    )

@pytest.mark.django_db
class TestTasks:
    def test_create_task_self(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("task-list-create")
        response = api_client.post(url, {
            "title": "My Task",
            "priority": "medium",
            "estimated_duration": 2
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert Task.objects.count() == 1
        assert Task.objects.get().assigned_to == user

    def test_manager_assign_task(self, api_client, manager, user):
        # Assign user to manager
        user.manager = manager
        user.save()

        api_client.force_authenticate(user=manager)
        url = reverse("task-list-create")
        response = api_client.post(url, {
            "title": "Team Task",
            "priority": "high",
            "assigned_to": user.id
        })
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
