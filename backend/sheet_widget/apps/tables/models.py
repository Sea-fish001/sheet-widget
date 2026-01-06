# models.py
import uuid
from django.db import models

class Table(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, blank=True)
    data = models.JSONField(default=dict, blank=True)
    cell_settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Настройки ячеек: {'row,col': {'color': '#FFFFFF', 'type': 'text'}}"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title or str(self.id)


class WidgetInfo(models.Model):
    widget_id = models.BigIntegerField()
    user_id = models.BigIntegerField()
    role = models.CharField(max_length=100)
    config = models.JSONField(default=dict, blank=True)
    board = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Widget {self.widget_id} (user {self.user_id})"
