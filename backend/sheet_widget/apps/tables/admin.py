from django.contrib import admin

from django.contrib import admin
from .models import Table, WidgetInfo

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'updated_at')


@admin.register(WidgetInfo)
class WidgetInfoAdmin(admin.ModelAdmin):
    list_display = ('widget_id', 'user_id', 'role', 'created_at')
