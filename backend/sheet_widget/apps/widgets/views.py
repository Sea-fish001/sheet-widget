from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import WidgetConfig
from .serializers import WidgetConfigSerializer


class WidgetConfigViewSet(viewsets.ModelViewSet):
    queryset = WidgetConfig.objects.all()
    serializer_class = WidgetConfigSerializer
    lookup_field = 'widget_id'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        widget_id = validated['widget_id']
        instance, created = WidgetConfig.objects.update_or_create(
            widget_id=widget_id,
            defaults=validated,
        )
        output = self.get_serializer(instance)
        return Response(
            output.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
