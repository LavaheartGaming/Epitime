from rest_framework import serializers
from django.db import IntegrityError
from .models import User, TimeEntry

class UserSerializer(serializers.ModelSerializer):
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
            raise serializers.ValidationError({
                "email": "❌ This email is already registered."
            })

        return user

    # update() stays the same
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            if attr == "password":
                instance.set_password(value)
            else:
                setattr(instance, attr, value)
        instance.save()
        return instance

class TimeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeEntry
        fields = ["id", "clock_in", "clock_out", "total_hours"]
        read_only_fields = ["total_hours"]