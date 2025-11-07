# Quick Start Guide

## Предварительные требования

- Docker и Docker Compose
- Bun (https://bun.sh)

## Быстрый старт

### 1. Настройка окружения

```bash
# Скопируйте .env.example в .env и настройте переменные
cp .env.example .env

# Отредактируйте .env при необходимости
```

### 2. Запуск инфраструктуры

```bash
# Запустите все сервисы (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Дождитесь готовности сервисов (проверьте healthcheck)
docker-compose ps
```

### 3. Настройка базы данных

```bash
# Перейдите в директорию API
cd api

# Установите зависимости
bun install

# Сгенерируйте миграции (если еще не созданы)
bun run db:generate

# Выполните миграции
bun run db:migrate

# (Опционально) Заполните тестовыми данными
bun run seed
```

### 4. Настройка MinIO

MinIO должен автоматически создать бакет при первом запуске через `minio-init` сервис.

Если нужно создать вручную:
```bash
# Войдите в контейнер minio-init или используйте mc клиент
docker exec -it dam-minio-init mc mb local/assets
docker exec -it dam-minio-init mc anonymous set none local/assets
```

### 5. Запуск сервисов

#### Terminal 1 - API
```bash
cd api
bun run dev
```

#### Terminal 2 - Worker
```bash
cd worker
bun install
bun run dev
```

#### Terminal 3 - Web
```bash
cd web
bun install
bun run dev
```

### 6. Проверка работоспособности

1. **API Health Check**
   ```bash
   curl http://localhost:8787/health
   ```
   Ожидаемый ответ: `{"status":"ok","timestamp":"..."}`

2. **Web UI**
   Откройте http://localhost:5173 в браузере

3. **MinIO Console**
   Откройте http://localhost:9001 (логин/пароль из .env)

## Тестирование загрузки файла

### Через Web UI

1. Откройте http://localhost:5173
2. Нажмите "Upload" или перетащите файл
3. Дождитесь завершения загрузки
4. Проверьте список активов

### Через API (curl)

```bash
# 1. Получите JWT токен (нужно реализовать auth endpoint)
# Для теста можно временно отключить auth middleware

# 2. Инициализируйте загрузку
curl -X POST http://localhost:8787/uploads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "target": "new_asset",
    "fileName": "test.pdf",
    "mime": "application/pdf",
    "totalSize": 1024
  }'

# 3. Загрузите части и завершите (см. документацию API)
```

## Структура проекта

```
dam/
├── api/              # Backend API (Bun + Hono)
│   ├── src/
│   │   ├── db/       # Drizzle схемы и DAO
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # S3, Redis интеграция
│   │   └── middleware/
│   └── Dockerfile
├── worker/           # Worker для рендеринга
│   ├── src/
│   │   ├── services/ # Рендеринг PDF/изображений
│   │   └── db/       # Доступ к БД
│   └── Dockerfile
├── web/             # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/   # Страницы приложения
│   │   ├── components/
│   │   └── lib/      # API клиент
│   └── vite.config.ts
├── docker-compose.yml
└── .env.example
```

## Команды разработки

### API
- `bun run dev` - запуск в dev режиме с hot reload
- `bun run db:generate` - генерация миграций из схемы
- `bun run db:migrate` - выполнение миграций
- `bun run lint` - проверка кода

### Worker
- `bun run dev` - запуск в dev режиме
- `bun run lint` - проверка кода

### Web
- `bun run dev` - запуск dev сервера (http://localhost:5173)
- `bun run build` - сборка для production
- `bun run lint` - проверка кода

## Переменные окружения

Основные переменные (см. `.env.example`):

- `DATABASE_URL` - строка подключения к PostgreSQL
- `REDIS_URL` - строка подключения к Redis
- `MINIO_ENDPOINT` - endpoint MinIO
- `MINIO_KEY` / `MINIO_SECRET` - credentials MinIO
- `MINIO_BUCKET` - имя бакета (по умолчанию "assets")
- `PRESIGN_TTL_SECONDS` - TTL для presigned URLs (600 сек)
- `JWT_SECRET` - секретный ключ для JWT

## Troubleshooting

### Проблема: Миграции не выполняются

**Решение:**
```bash
# Убедитесь, что PostgreSQL запущен
docker-compose ps postgres

# Проверьте подключение
docker exec -it dam-postgres psql -U dam -d dam_db

# Выполните миграции вручную если нужно
cd api && bun run db:migrate
```

### Проблема: Worker не обрабатывает задачи

**Решение:**
```bash
# Проверьте Redis
docker exec -it dam-redis redis-cli ping

# Проверьте очередь
docker exec -it dam-redis redis-cli LLEN queue:preview

# Проверьте логи worker
docker-compose logs worker
```

### Проблема: MinIO не доступен

**Решение:**
```bash
# Проверьте статус
docker-compose ps minio

# Проверьте логи
docker-compose logs minio

# Пересоздайте бакет
docker exec -it dam-minio-init mc mb -p local/assets
```

## Следующие шаги

1. Настройте реальную аутентификацию (OAuth2/OIDC)
2. Добавьте тесты (unit + integration)
3. Настройте CI/CD
4. Добавьте мониторинг и логирование
5. Оптимизируйте производительность

## Дополнительная документация

- `CHANGELOG.md` - детальный changelog по этапам
- `TEST_CASES.md` - список тест-кейсов
- `Documentation.txt` - полное техническое задание

