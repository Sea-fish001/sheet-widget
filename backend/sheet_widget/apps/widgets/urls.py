from rest_framework.routers import DefaultRouter

from .views import WidgetConfigViewSet

router = DefaultRouter()
router.register(r'widget-info', WidgetConfigViewSet, basename='widget-info')

urlpatterns = router.urls
