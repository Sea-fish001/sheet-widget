# serializers.py
from rest_framework import serializers
from .models import Table, WidgetInfo


class TableSerializer(serializers.ModelSerializer):
    cell_settings = serializers.JSONField(
        required=False,
        default=dict,
        write_only=False,
        help_text="Настройки ячеек: {'row,col': {'color': '#FFFFFF', 'type': 'text'}}"
    )

    class Meta:
        model = Table
        fields = ['id', 'title', 'data', 'cell_settings', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_cell_settings(self, value):
        """Валидация настроек ячеек"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("cell_settings должен быть словарем")
        return value


class WidgetInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = WidgetInfo
        fields = ['id', 'widget_id', 'user_id', 'role', 'config', 'board', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_data(self, value):
        """Валидация данных таблицы"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("data должен быть словарем")

        # Проверяем наличие ключа 'rows'
        if 'rows' not in value:
            value['rows'] = [['']]

        # Убеждаемся, что rows - это список списков
        if not isinstance(value['rows'], list):
            value['rows'] = [['']]
        elif value['rows'] and not isinstance(value['rows'][0], list):
            # Если передали одномерный список, превращаем в список списков
            value['rows'] = [value['rows']] if value['rows'] else [['']]

        return value
