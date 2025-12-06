from django.contrib import admin

from django.contrib import admin
from .models import Table

@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'updated_at')
