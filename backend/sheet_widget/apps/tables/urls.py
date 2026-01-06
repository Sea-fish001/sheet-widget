from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TableViewSet, WidgetInfoViewSet

router = DefaultRouter()
router.register(r'tables', TableViewSet, basename='tables')
router.register(r'widget-info', WidgetInfoViewSet, basename='widget-info')

urlpatterns = [
    path('', include(router.urls)),
]
