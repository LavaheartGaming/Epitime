from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Task, TeamStatus, TimeEntry, User
from .serializers import TaskSerializer, TeamStatusSerializer, TimeEntrySerializer, UserSerializer


# === Liste et création des utilisateurs ===
class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


# === Inscription ===
class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "✅ User registered successfully!"}, status=status.HTTP_201_CREATED)
        print("REGISTER ERRORS:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# === Connexion ===
class LoginView(APIView):
    def post(self, request):
        print("=== DEBUG LOGIN ===")
        print(request.data)
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "❌ Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({"error": "❌ Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "✅ Login successful",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "phone_number": user.phone_number,
                    "two_factor_enabled": user.two_factor_enabled,
                },
            },
            status=status.HTTP_200_OK,
        )


# === Mise à jour du profil ===
class UpdateUserView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# === Changement de mot de passe ===
class ChangePasswordView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not old_password or not new_password or not confirm_password:
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "❌ Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"error": "⚠️ Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "✅ Password changed successfully!"}, status=status.HTTP_200_OK)


# === Suppression du compte ===
class DeleteAccountView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "✅ Account deleted successfully."}, status=200)


class ClockInView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # Prevent starting a new session if one is already open
        open_entry = TimeEntry.objects.filter(user=user, clock_out__isnull=True).order_by("-clock_in").first()
        if open_entry:
            return Response(
                {"error": "You are already clocked in. Clock out before clocking in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entry = TimeEntry.objects.create(user=user, clock_in=timezone.now())
        return Response(
            {"message": "✅ Clocked in successfully.", "entry": TimeEntrySerializer(entry).data},
            status=status.HTTP_200_OK,
        )


class ClockOutView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        # Close the latest open session
        entry = TimeEntry.objects.filter(user=user, clock_out__isnull=True).order_by("-clock_in").first()
        if not entry:
            return Response(
                {"error": "You are not clocked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        entry.clock_out = timezone.now()
        entry.compute_total_hours()
        entry.save()

        return Response(
            {"message": "✅ Clocked out successfully.", "entry": TimeEntrySerializer(entry).data},
            status=status.HTTP_200_OK,
        )


class TimeEntryListView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = TimeEntry.objects.filter(user=request.user).order_by("-clock_in")[:200]
        return Response(TimeEntrySerializer(entries, many=True).data, status=status.HTTP_200_OK)


# ---- Permissions ----
class IsManagerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ["manager", "admin"])


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


def _is_in_manager_team(manager_user, target_user) -> bool:
    """Check if target_user is manageable by manager_user.
    Managers can only manage regular users, not other managers/admins."""
    if target_user.role in ["manager", "admin"]:
        return False  # Managers cannot manage other managers/admins
    return target_user.manager_id == manager_user.id


# ---- Team Manager: list team members with live clocked-in + today's status ----
class TeamMembersView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        today = timezone.localdate()

        if request.user.role == "admin":
            users_qs = User.objects.all().order_by("last_name", "first_name")
        elif request.user.role == "manager":
            # Managers see all users but can only manage regular users
            users_qs = User.objects.all().order_by("last_name", "first_name")
        else:
            # Regular users shouldn't access this endpoint
            users_qs = User.objects.none()

        # open session info
        open_entries = TimeEntry.objects.filter(user__in=users_qs, clock_out__isnull=True)
        open_map = {e.user_id: e for e in open_entries}

        status_qs = TeamStatus.objects.filter(user__in=users_qs, date=today)
        status_map = {s.user_id: s for s in status_qs}

        data = []
        for u in users_qs:
            open_entry = open_map.get(u.id)
            status_obj = status_map.get(u.id)
            data.append(
                {
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "role": u.role,
                    "manager_id": u.manager_id,
                    "manager_name": u.manager.full_name if u.manager else None,
                    "is_clocked_in": bool(open_entry),
                    "open_clock_in": open_entry.clock_in.isoformat() if open_entry else None,
                    "today_status": status_obj.status if status_obj else "normal",
                    "today_status_note": status_obj.note if status_obj else "",
                }
            )

        return Response(data, status=status.HTTP_200_OK)


# ---- Team Manager: view a specific user's time history ----
class TeamMemberTimeEntriesView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def get(self, request, user_id: int):
        target = get_object_or_404(User, id=user_id)

        if request.user.role != "admin" and not _is_in_manager_team(request.user, target):
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        entries = TimeEntry.objects.filter(user=target).order_by("-clock_in")[:300]
        return Response(TimeEntrySerializer(entries, many=True).data, status=status.HTTP_200_OK)


# ---- Manager/Admin: set today's status (late/pto/normal) ----
class TeamStatusSetView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def post(self, request):
        user_id = request.data.get("user_id")
        status_value = request.data.get("status")
        note = request.data.get("note", "")
        date_str = request.data.get("date")  # optional: YYYY-MM-DD

        if not user_id or not status_value:
            return Response({"error": "user_id and status are required."}, status=400)

        if status_value not in ["normal", "late", "pto"]:
            return Response({"error": "Invalid status."}, status=400)

        target = get_object_or_404(User, id=user_id)

        if request.user.role != "admin" and not _is_in_manager_team(request.user, target):
            return Response({"error": "Not allowed."}, status=403)

        date_obj = timezone.localdate()
        if date_str:
            try:
                date_obj = timezone.datetime.fromisoformat(date_str).date()
            except Exception:
                return Response({"error": "Invalid date format (use YYYY-MM-DD)."}, status=400)

        obj, _ = TeamStatus.objects.update_or_create(
            user=target,
            date=date_obj,
            defaults={"status": status_value, "note": note},
        )

        return Response(TeamStatusSerializer(obj).data, status=200)


# ---- Manager/Admin: create or fix a time entry for a team member ----
class TeamTimeEntryUpsertView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def post(self, request):
        user_id = request.data.get("user_id")
        clock_in = request.data.get("clock_in")  # ISO datetime
        clock_out = request.data.get("clock_out")  # ISO datetime (optional)
        entry_id = request.data.get("entry_id")  # optional: if you want to edit an existing entry

        if not user_id or not clock_in:
            return Response({"error": "user_id and clock_in are required."}, status=400)

        target = get_object_or_404(User, id=user_id)

        if request.user.role != "admin" and not _is_in_manager_team(request.user, target):
            return Response({"error": "Not allowed."}, status=403)

        try:
            dt_in = timezone.datetime.fromisoformat(clock_in.replace("Z", "+00:00"))
        except Exception:
            return Response({"error": "Invalid clock_in format (ISO datetime)."}, status=400)

        dt_out = None
        if clock_out:
            try:
                dt_out = timezone.datetime.fromisoformat(clock_out.replace("Z", "+00:00"))
            except Exception:
                return Response({"error": "Invalid clock_out format (ISO datetime)."}, status=400)

        if entry_id:
            entry = get_object_or_404(TimeEntry, id=entry_id, user=target)
            entry.clock_in = dt_in
            entry.clock_out = dt_out
        else:
            entry = TimeEntry(user=target, clock_in=dt_in, clock_out=dt_out)

        entry.compute_total_hours()
        entry.save()

        return Response(TimeEntrySerializer(entry).data, status=200)


# ---- Admin only: assign or remove user -> manager ----
class AdminAssignManagerView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def put(self, request):
        user_id = request.data.get("user_id")
        manager_id = request.data.get("manager_id")  # can be null to remove

        # Convert to int if not None
        if user_id is not None:
            user_id = int(user_id)
        if manager_id is not None:
            manager_id = int(manager_id)

        if not user_id:
            return Response({"error": "user_id is required."}, status=400)

        target = get_object_or_404(User, id=user_id)

        # Managers cannot manage other managers/admins
        if request.user.role == "manager" and target.role in ["manager", "admin"]:
            return Response({"error": "You cannot manage other managers or admins."}, status=403)

        if manager_id is None:
            # Managers can only remove from their own team
            if request.user.role == "manager" and target.manager_id != request.user.id:
                return Response({"error": "You can only remove users from your own team."}, status=403)

            target.manager = None
            target.save()
            return Response({"message": "✅ Manager removed."}, status=200)

        manager_user = get_object_or_404(User, id=manager_id)
        if manager_user.role not in ["manager", "admin"]:
            return Response({"error": "manager_id must be a manager/admin user."}, status=400)

        # Managers can only assign to themselves
        if request.user.role == "manager" and manager_id != request.user.id:
            return Response({"error": "You can only assign users to yourself."}, status=403)

        target.manager = manager_user
        target.save()
        return Response(
            {"message": "✅ Manager assigned.", "user_id": target.id, "manager_id": manager_user.id}, status=200
        )


class MyTodayStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        try:
            status = TeamStatus.objects.get(user=request.user, date=today)
            return Response(
                {
                    "status": status.status,
                    "note": status.note,
                    "date": str(today),
                }
            )
        except TeamStatus.DoesNotExist:
            return Response({"status": "normal"})


class MyTeamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        # Case 1: Manager -> their team is the users assigned to them
        if request.user.role in ["manager", "admin"]:
            users_qs = User.objects.filter(manager=request.user)

            # exclude self (even if it somehow appears)
            users_qs = users_qs.exclude(id=request.user.id)

            manager_info = {
                "id": request.user.id,
                "full_name": request.user.full_name,
                "email": request.user.email,
                "role": request.user.role,
            }

        # Case 2: Normal user -> team is everyone with the same manager
        else:
            if not request.user.manager_id:
                return Response({"manager": None, "members": []})

            manager = request.user.manager

            users_qs = User.objects.filter(manager=manager)

            # exclude self
            users_qs = users_qs.exclude(id=request.user.id)

            manager_info = {
                "id": manager.id,
                "full_name": manager.full_name,
                "email": manager.email,
                "role": manager.role,
            }

        users_qs = users_qs.order_by("last_name", "first_name")

        # open sessions = clocked in
        open_entries = TimeEntry.objects.filter(user__in=users_qs, clock_out__isnull=True)
        open_map = {e.user_id: e for e in open_entries}

        # today's status
        status_qs = TeamStatus.objects.filter(user__in=users_qs, date=today)
        status_map = {s.user_id: s for s in status_qs}

        members = []
        for u in users_qs:
            open_entry = open_map.get(u.id)
            status_obj = status_map.get(u.id)

            members.append(
                {
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "role": u.role,
                    "is_clocked_in": bool(open_entry),
                    "open_clock_in": open_entry.clock_in.isoformat() if open_entry else None,
                    "today_status": status_obj.status if status_obj else "normal",
                    "today_status_note": status_obj.note if status_obj else "",
                }
            )

        return Response({"manager": manager_info, "members": members})


# ---- Task Views for Users ----
class TaskListCreateView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """List tasks based on user role"""
        if request.user.role == "admin":
            # Admins see all tasks
            tasks = Task.objects.all().order_by("-created_at")
        elif request.user.role == "manager":
            # Managers see tasks of their team + their own tasks
            team_members = User.objects.filter(manager=request.user)
            tasks = (
                Task.objects.filter(
                    models.Q(assigned_to=request.user)
                    | models.Q(created_by=request.user)
                    | models.Q(assigned_to__in=team_members)
                    | models.Q(created_by__in=team_members)
                )
                .distinct()
                .order_by("-created_at")
            )
        else:
            # Regular users see only their own tasks
            tasks = (
                Task.objects.filter(models.Q(assigned_to=request.user) | models.Q(created_by=request.user))
                .distinct()
                .order_by("-created_at")
            )

        return Response(TaskSerializer(tasks, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new task with role-based assignment"""
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            assigned_to_id = request.data.get("assigned_to", request.user.id)
            # Ensure it's an integer
            if assigned_to_id is not None:
                assigned_to_id = int(assigned_to_id)

            # Regular users can only assign to themselves
            if request.user.role == "user":
                assigned_to_id = request.user.id
            elif request.user.role == "manager":
                # Managers can assign to themselves or their team members
                if assigned_to_id != request.user.id:
                    team_member_ids = list(User.objects.filter(manager=request.user).values_list("id", flat=True))
                    if assigned_to_id not in team_member_ids:
                        return Response(
                            {"error": "You can only assign tasks to your team members."},
                            status=status.HTTP_403_FORBIDDEN,
                        )
            # Admins can assign to anyone (no restriction)

            assigned_user = get_object_or_404(User, id=assigned_to_id)

            # Managers cannot assign tasks to other managers/admins
            if request.user.role == "manager" and assigned_user.role in ["manager", "admin"]:
                return Response(
                    {"error": "You cannot assign tasks to managers or admins."}, status=status.HTTP_403_FORBIDDEN
                )

            serializer.save(created_by=request.user, assigned_to=assigned_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TaskDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_task(self, pk, user):
        """Get task only if user has access"""
        task = get_object_or_404(Task, pk=pk)

        # Admin can access all tasks
        if user.role == "admin":
            return task

        # User owns the task (assigned or created)
        if task.assigned_to == user or task.created_by == user:
            return task

        # Manager can access tasks of their team members
        if user.role == "manager":
            team_member_ids = User.objects.filter(manager=user).values_list("id", flat=True)
            if task.assigned_to_id in team_member_ids or task.created_by_id in team_member_ids:
                return task

        return None

    def get(self, request, pk):
        task = self.get_task(pk, request.user)
        if not task:
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        return Response(TaskSerializer(task).data)

    def put(self, request, pk):
        task = self.get_task(pk, request.user)
        if not task:
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        task = self.get_task(pk, request.user)
        if not task:
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        task.delete()
        return Response({"message": "✅ Task deleted."}, status=status.HTTP_200_OK)
