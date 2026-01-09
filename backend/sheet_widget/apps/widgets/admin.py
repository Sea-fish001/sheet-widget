from django.contrib import admin

from .models import WidgetConfig


@admin.register(WidgetConfig)
class WidgetConfigAdmin(admin.ModelAdmin):
    list_display = ('widget_id', 'user_id', 'role', 'updated_at')
    search_fields = ('widget_id', 'user_id', 'role')
    list_filter = ('role',)
