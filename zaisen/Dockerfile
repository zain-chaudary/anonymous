FROM python:3.12-slim

WORKDIR /app
COPY zaisen ./zaisen

# stdlib only — nothing to pip install
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

EXPOSE 8000
CMD ["python3", "zaisen/server.py"]
