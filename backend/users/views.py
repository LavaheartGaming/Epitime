from django.db import models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Conversation, Message, Task, Team, TeamStatus, TimeEntry, User, WorkingHours
from .serializers import ConversationSerializer, MessageSerializer, TaskSerializer, TeamStatusSerializer, TimeEntrySerializer, UserSerializer, WorkingHoursSerializer


class TeamSerializer(serializers.ModelSerializer):
    members_count = serializers.IntegerField(source="members.count", read_only=True)
    managers = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ["id", "name", "description", "created_at", "members_count", "managers"]

    def get_managers(self, obj):
        return [
            {"id": m.id, "full_name": m.full_name, "email": m.email}
            for m in obj.members.filter(role__in=["manager", "admin"])
        ]


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


class MeView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "phone_number": user.phone_number,
            "two_factor_enabled": user.two_factor_enabled,
        }, status=status.HTTP_200_OK)


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
    """Check if target_user is in the same team as manager_user."""
    if not manager_user.team_id or not target_user.team_id:
        return False
    return manager_user.team_id == target_user.team_id


# ---- Team Manager: list team members with live clocked-in + today's status ----
class TeamMembersView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        today = timezone.localdate()

        # Admin or Manager: return list of members in their team (or all appropriate context)
        # For Admin: list all users? Or maybe list by team?
        # The frontend expects a flat list for "Manage Team" view, but now we have explicit teams.
        # Let's adapt: if Admin, return ALL users. If Manager, return ONLY team members.
        if request.user.role == "admin":
            users_qs = User.objects.all().select_related("team").order_by("last_name", "first_name")
        elif request.user.role == "manager":
            if not request.user.team_id:
                users_qs = User.objects.none()
            else:
                users_qs = User.objects.filter(team_id=request.user.team_id).order_by("last_name", "first_name")
        else:
            return Response({"error": "Unauthorized"}, status=403)

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
                    "team_id": u.team_id,
                    "team_name": u.team.name if u.team else None,
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


# ---- Manager/Admin: view/set working hours for a team member ----
class WorkingHoursView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]

    def get(self, request, user_id: int):
        """Get working hours for a user."""
        target = get_object_or_404(User, id=user_id)

        if request.user.role != "admin" and not _is_in_manager_team(request.user, target):
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        hours = WorkingHours.objects.filter(user=target)
        return Response(WorkingHoursSerializer(hours, many=True).data, status=status.HTTP_200_OK)

    def put(self, request, user_id: int):
        """Set working hours for a user. Expects array of day schedules."""
        target = get_object_or_404(User, id=user_id)

        if request.user.role != "admin" and not _is_in_manager_team(request.user, target):
            return Response({"error": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        schedules = request.data.get("schedules", [])
        if not isinstance(schedules, list):
            return Response({"error": "schedules must be an array."}, status=status.HTTP_400_BAD_REQUEST)

        # Delete existing hours and create new ones
        WorkingHours.objects.filter(user=target).delete()

        created = []
        for item in schedules:
            day = item.get("day_of_week")
            start = item.get("start_time")
            end = item.get("end_time")

            if day is None or not start or not end:
                continue  # Skip invalid entries

            try:
                wh = WorkingHours.objects.create(
                    user=target,
                    day_of_week=int(day),
                    start_time=start,
                    end_time=end
                )
                created.append(wh)
            except Exception:
                continue  # Skip invalid entries

        return Response(WorkingHoursSerializer(created, many=True).data, status=status.HTTP_200_OK)


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
# ---- Admin: Create/List Teams ----
class TeamListCreateView(generics.ListCreateAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]  # Custom logic in methods
    serializer_class = TeamSerializer
    queryset = Team.objects.all()

    def get_queryset(self):
        # Admin sees all, Managers see their own? For now let's let admins manage teams.
        # Helper: Admins check teams.
        if self.request.user.role == "admin":
            return Team.objects.all().order_by("-created_at")
        # Managers can see their own team info
        if self.request.user.team:
            return Team.objects.filter(id=self.request.user.team.id)
        return Team.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role != "admin":
            return Response({"error": "Only admins can create teams"}, status=403)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---- Admin: Update/Delete Team ----
class TeamDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Team.objects.all()
    serializer_class = TeamSerializer


# ---- Admin: Assign User to Team ----
class AdminAssignTeamView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def put(self, request):
        user_id = request.data.get("user_id")
        team_id = request.data.get("team_id")  # Null to remove

        if not user_id:
            return Response({"error": "user_id is required"}, status=400)

        target = get_object_or_404(User, id=user_id)

        if team_id is None:
            target.team = None
            target.save()
            return Response({"message": "User removed from team."}, status=200)

        team = get_object_or_404(Team, id=team_id)
        target.team = team
        target.save()

        return Response({"message": f"User assigned to team {team.name}"}, status=200)


class MyTodayStatusView(APIView):
    authentication_classes = [JWTAuthentication]
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
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        # Check if user has a team
        if not request.user.team_id:
            return Response({
                "team_name": None,
                "team_id": None,
                "manager": None,
                "members": []
            })

        team = request.user.team
        
        # Get all team members except current user
        all_team_users = User.objects.filter(team=team).exclude(id=request.user.id)
        
        # Find the manager (user with role="manager" in this team)
        manager_user = all_team_users.filter(role="manager").first()
        
        # Get regular members (exclude manager)
        if manager_user:
            members_qs = all_team_users.exclude(id=manager_user.id).order_by("last_name", "first_name")
        else:
            members_qs = all_team_users.order_by("last_name", "first_name")

        # open sessions = clocked in
        all_users_to_check = list(members_qs)
        if manager_user:
            all_users_to_check.append(manager_user)
        
        open_entries = TimeEntry.objects.filter(user__in=all_users_to_check, clock_out__isnull=True)
        open_map = {e.user_id: e for e in open_entries}

        # today's status
        status_qs = TeamStatus.objects.filter(user__in=all_users_to_check, date=today)
        status_map = {s.user_id: s for s in status_qs}

        def build_user_info(u):
            open_entry = open_map.get(u.id)
            status_obj = status_map.get(u.id)
            return {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "is_clocked_in": bool(open_entry),
                "open_clock_in": open_entry.clock_in.isoformat() if open_entry else None,
                "today_status": status_obj.status if status_obj else "normal",
                "today_status_note": status_obj.note if status_obj else "",
            }

        # Build manager info
        manager_info = build_user_info(manager_user) if manager_user else None

        # Build members list
        members = [build_user_info(u) for u in members_qs]

        return Response({
            "team_name": team.name,
            "team_id": team.id,
            "manager": manager_info,
            "members": members
        })


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
            # Managers see tasks of their team members
            if request.user.team:
                team_members = User.objects.filter(team=request.user.team)
            else:
                team_members = User.objects.none()

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
                    team_member_ids = (
                        list(User.objects.filter(team=request.user.team).values_list("id", flat=True))
                        if request.user.team
                        else []
                    )

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
            if user.team:
                team_member_ids = User.objects.filter(team=user.team).values_list("id", flat=True)
            else:
                team_member_ids = []

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


# ---- Admin: Reset User Password ----
class AdminResetPasswordView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        user_id = request.data.get("user_id")
        new_password = request.data.get("new_password")

        if not user_id or not new_password:
            return Response({"error": "user_id and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, id=user_id)
        target_user.set_password(new_password)
        target_user.save()

        return Response({"message": f"✅ Password for {target_user.email} has been reset."}, status=status.HTTP_200_OK)


# ==== CHAT API ====

class ConversationListCreateView(APIView):
    """List user's conversations or create a new one"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get conversations where user is a participant
        conversations = request.user.conversations.all()
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    def post(self, request):
        name = request.data.get("name")
        participant_ids = request.data.get("participants", [])
        is_direct = request.data.get("is_direct", False)

        if not name:
            return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Create conversation
        conversation = Conversation.objects.create(
            name=name,
            team=request.user.team,
            is_direct=is_direct,
        )
        # Add creator as participant
        conversation.participants.add(request.user)
        
        # Add other participants
        if participant_ids:
            users = User.objects.filter(id__in=participant_ids)
            conversation.participants.add(*users)

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationMessagesView(APIView):
    """Get messages from a conversation or send a new message"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        # Check if user is a participant
        if not conversation.participants.filter(id=request.user.id).exists():
            return Response({"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN)

        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        # Check if user is a participant
        if not conversation.participants.filter(id=request.user.id).exists():
            return Response({"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get("content")
        if not content:
            return Response({"error": "content is required"}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
        )
        # Update conversation timestamp
        conversation.save()

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TeamConversationView(APIView):
    """Get or create team conversation for all team members"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.team:
            return Response({"error": "No team assigned"}, status=status.HTTP_400_BAD_REQUEST)

        team = request.user.team
        
        # Try to find existing team conversation
        conversation = Conversation.objects.filter(team=team, is_direct=False).first()
        
        if not conversation:
            # Create team conversation
            conversation = Conversation.objects.create(
                name=team.name,
                team=team,
                is_direct=False,
            )
            # Add all team members as participants
            team_members = User.objects.filter(team=team)
            conversation.participants.add(*team_members)

        # Ensure current user is participant
        if not conversation.participants.filter(id=request.user.id).exists():
            conversation.participants.add(request.user)

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)


class StartDirectConversationView(APIView):
    """Start or get a direct conversation with another user"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get("user_id")
        
        if not target_user_id:
            return Response({"error": "user_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        target_user = get_object_or_404(User, id=target_user_id)
        
        if target_user.id == request.user.id:
            return Response({"error": "Cannot chat with yourself"}, status=status.HTTP_400_BAD_REQUEST)

        # Try to find existing direct conversation between these two users
        existing = Conversation.objects.filter(
            is_direct=True,
            participants=request.user
        ).filter(
            participants=target_user
        ).first()

        if existing:
            serializer = ConversationSerializer(existing)
            return Response(serializer.data)

        # Create new direct conversation
        conversation = Conversation.objects.create(
            name=f"{request.user.first_name} & {target_user.first_name}",
            is_direct=True,
        )
        conversation.participants.add(request.user, target_user)

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    """Edit or delete a message"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def put(self, request, message_id):
        message = get_object_or_404(Message, id=message_id)
        
        # Only sender can edit
        if message.sender.id != request.user.id:
            return Response({"error": "Cannot edit others' messages"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get("content")
        if not content:
            return Response({"error": "content is required"}, status=status.HTTP_400_BAD_REQUEST)

        message.content = content
        message.save()

        serializer = MessageSerializer(message)
        return Response(serializer.data)

    def delete(self, request, message_id):
        message = get_object_or_404(Message, id=message_id)
        
        # Only sender can delete
        if message.sender.id != request.user.id:
            return Response({"error": "Cannot delete others' messages"}, status=status.HTTP_403_FORBIDDEN)

        message.delete()
        return Response({"message": "Message deleted"}, status=status.HTTP_200_OK)


class ConversationDetailView(APIView):
    """Delete a conversation"""
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, conversation_id):
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        # Check if user is a participant
        if not conversation.participants.filter(id=request.user.id).exists():
            return Response({"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN)

        # Only allow deleting direct conversations
        if not conversation.is_direct:
            return Response({"error": "Cannot delete team conversations"}, status=status.HTTP_400_BAD_REQUEST)

        conversation.delete()
        return Response({"message": "Conversation deleted"}, status=status.HTTP_200_OK)



