FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./
COPY grammar_course.py ./
COPY auth_support.py ./
COPY writing_coach ./writing_coach
COPY VERSION ./
COPY BECOMING_FRONTEND_VERSION ./
COPY compose.yaml ./
COPY docs/POSTGRES_FOUNDATION.md ./docs/POSTGRES_FOUNDATION.md
COPY docs/PERSISTENCE_RUNTIME_READINESS.md ./docs/PERSISTENCE_RUNTIME_READINESS.md
COPY docs/LEARNING_REPOSITORY_BOUNDARY.md ./docs/LEARNING_REPOSITORY_BOUNDARY.md
COPY docs/SPECIALIZED_PERSISTENCE_BOUNDARY.md ./docs/SPECIALIZED_PERSISTENCE_BOUNDARY.md
COPY alembic.ini ./
COPY migrations ./migrations
COPY scripts ./scripts
COPY templates ./templates
COPY static ./static

RUN mkdir -p /data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
