from django.db import IntegrityError
from rest_framework import serializers

from .models import Task, TeamStatus, TimeEntry, User, WorkingHours


class UserSerializer(serializers.ModelSerializer):
    team_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "two_factor_enabled",
            "password",
            "full_name",
            "team_id",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)

        if password:
            user.set_password(password)

        try:
            user.save()
        except IntegrityError:
            raise serializers.ValidationError({"email": "❌ This email is already registered."}) from None

        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            if attr == "password":
                instance.set_password(value)
            elif attr == "team_id":
                instance.team_id = value
            else:
                setattr(instance, attr, value)
        instance.save()
        return instance


class TimeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeEntry
        fields = ["id", "clock_in", "clock_out", "total_hours"]
        read_only_fields = ["total_hours"]


class TeamStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamStatus
        fields = ["id", "user", "date", "status", "note", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "priority",
            "estimated_duration",
            "progress",
            "due_date",
            "created_by",
            "assigned_to",
            "assigned_to_name",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "assigned_to", "created_at", "updated_at"]

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None


class WorkingHoursSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = WorkingHours
        fields = ["id", "day_of_week", "day_name", "start_time", "end_time"]
        read_only_fields = ["id"]


# Chat Serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "sender_id", "sender_name", "content", "created_at"]
        read_only_fields = ["sender", "created_at"]

    def get_sender_name(self, obj):
        return obj.sender.full_name if obj.sender else "Unknown"


class ConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "name", "team", "is_direct", "last_message", "participant_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if last:
            return {
                "content": last.content[:50] + "..." if len(last.content) > 50 else last.content,
                "sender_name": last.sender.full_name,
                "created_at": last.created_at.isoformat(),
            }
        return None

    def get_participant_count(self, obj):
        return obj.participants.count()

