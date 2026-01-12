from django.db import models


class WidgetConfig(models.Model):
    widget_id = models.IntegerField(unique=True)
    user_id = models.IntegerField()
    role = models.CharField(max_length=100)
    config = models.JSONField(default=dict, blank=True)
    board = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'Widget {self.widget_id}'
