# views.py
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
import csv
import json

from .models import Table
from .serializers import TableSerializer


class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all().order_by('-updated_at')
    serializer_class = TableSerializer

    @action(detail=True, methods=['get'])
    def export_json(self, request, pk=None):
        """Экспорт таблицы в JSON со всей информацией"""
        table = self.get_object()

        export_data = {
            'id': str(table.id),
            'title': table.title,
            'data': table.data,
            'cell_settings': table.cell_settings,
            'created_at': table.created_at.isoformat() if table.created_at else None,
            'updated_at': table.updated_at.isoformat() if table.updated_at else None,
            'exported_at': timezone.now().isoformat()
        }

        response = HttpResponse(
            json.dumps(export_data, ensure_ascii=False, indent=2),
            content_type='application/json; charset=utf-8',
        )
        response['Content-Disposition'] = f'attachment; filename="{table.title or "table_" + str(table.id)}.json"'
        return response

    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        """Экспорт таблицы в CSV"""
        table = self.get_object()
        data = table.data.get('rows', [['']])

        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{table.title or "table_" + str(table.id)}.csv"'
        writer = csv.writer(response)

        for row in data:
            writer.writerow(row)

        return response