FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# зависимости Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# код проекта
COPY . .

EXPOSE 8000

CMD ["gunicorn", "sheet_widget.wsgi:application", "--bind", "0.0.0.0:8000"]
