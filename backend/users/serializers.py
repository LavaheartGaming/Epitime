from rest_framework import serializers
from .models import User

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
            # Use the custom manager to handle password hashing properly
            password = validated_data.pop("password", None)
            user = User(**validated_data)
            if password:
                user.set_password(password)
            user.save()
            return user

    def update(self, instance, validated_data):
        # Normal field updates
        for attr, value in validated_data.items():
            if attr == "password":
                instance.set_password(value)
            else:
                setattr(instance, attr, value)
        instance.save()
        return instance
