from rest_framework import serializers
from django.db import IntegrityError
from .models import User, TimeEntry, TeamStatus, Task

class UserSerializer(serializers.ModelSerializer):
    manager_id = serializers.IntegerField(required=False, allow_null=True)
    manager_name = serializers.SerializerMethodField()

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
            "manager_id",
            "manager_name",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def get_manager_name(self, obj):
        return obj.manager.full_name if obj.manager else None

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)

        if password:
            user.set_password(password)

        try:
            user.save()
        except IntegrityError:
            raise serializers.ValidationError({
                "email": "❌ This email is already registered."
            })

        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            if attr == "password":
                instance.set_password(value)
            elif attr == "manager_id":
                instance.manager_id = value
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
            "id", "title", "description", "priority", "estimated_duration",
            "progress", "due_date", "created_by", "assigned_to",
            "assigned_to_name", "created_by_name", "created_at", "updated_at"
        ]
        read_only_fields = ["created_by", "assigned_to", "created_at", "updated_at"]

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by else None

