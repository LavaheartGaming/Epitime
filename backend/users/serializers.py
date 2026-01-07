from rest_framework import serializers
from django.db import IntegrityError
from .models import User, TimeEntry, TeamStatus

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
