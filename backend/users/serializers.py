from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number', 'role', 'password']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
        }

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            phone_number=validated_data.get('phone_number', ''),
            role=validated_data.get('role', 'user'),
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

    def update(self, instance, validated_data):
        # Mise à jour des champs normaux
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        instance.phone_number = validated_data.get('phone_number', instance.phone_number)
        instance.role = validated_data.get('role', instance.role)

        # Si le mot de passe est fourni, le hasher
        password = validated_data.get('password', None)
        if password:
            instance.set_password(password)

        instance.save()
        return instance
