from django.shortcuts import render

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
import csv, json

from .models import Table
from .serializers import TableSerializer

class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.all().order_by('-updated_at')
    serializer_class = TableSerializer

    @action(detail=True, methods=['get'])
    def export_json(self, request, pk=None):
        table = self.get_object()
        return Response(table.data)

    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        table = self.get_object()
        data = table.data
        rows = []
        if isinstance(data, dict) and 'rows' in data:
            rows = data['rows']
        elif isinstance(data, list):
            rows = data
        else:
            rows = [[json.dumps(data)]]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="table_{table.id}.csv"'
        writer = csv.writer(response)
        for row in rows:
            writer.writerow(row)
        return response
