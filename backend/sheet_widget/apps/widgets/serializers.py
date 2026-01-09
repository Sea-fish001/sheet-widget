from rest_framework import serializers

from .models import WidgetConfig


class WidgetConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WidgetConfig
        fields = [
            'id',
            'widget_id',
            'user_id',
            'role',
            'config',
            'board',
            'created_at',
            'updated_at',
        ]
