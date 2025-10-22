from django.urls import path
from .views import (
    UserListCreateView, RegisterView, LoginView, UpdateUserView,
    ChangePasswordView, DeleteAccountView, Enable2FAView, Verify2FAView
)

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("update/", UpdateUserView.as_view(), name="update"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("delete/", DeleteAccountView.as_view(), name="delete-account"),
    path("enable-2fa/", Enable2FAView.as_view(), name="enable-2fa"),
    path("verify-2fa/", Verify2FAView.as_view(), name="verify-2fa"),
]
