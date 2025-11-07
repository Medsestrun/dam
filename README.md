# DAM MVP

Digital Asset Management система с поддержкой больших файлов, версионности, предпросмотра и аннотаций.

## Стек

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Bun + Hono + Drizzle (PostgreSQL) + Redis + MinIO
- **Worker**: Bun для рендеринга и конвертации

## Функциональность

✅ **Реализовано:**
- Multipart upload больших файлов (>10GB)
- Версионность активов
- Рендеринг превью (PDF, изображения, Office → PDF)
- Базовый поиск по SQL с индексами
- Presigned URLs для безопасной раздачи
- Web UI с drag&drop загрузкой
- Базовый просмотр PDF и изображений

⚠️ **Частично реализовано:**
- Аннотации (API готов, UI компонент нуждается в доработке)
- ACL проверки (структура есть, проверки не полностью реализованы)
- Аудит логирование (структура есть, логирование не реализовано)

## Быстрый старт

См. [QUICKSTART.md](./QUICKSTART.md) для детальных инструкций.

### Краткая версия:

```bash
# 1. Настройка окружения
cp .env.example .env

# 2. Запуск инфраструктуры
docker-compose up -d

# 3. Миграции БД
cd api && bun install && bun run db:migrate

# 4. Запуск сервисов (в разных терминалах)
cd api && bun run dev          # Terminal 1
cd worker && bun install && bun run dev  # Terminal 2
cd web && bun install && bun run dev    # Terminal 3
```

## Структура проекта

- `api/` - Backend API (Hono + Drizzle)
- `worker/` - Worker для рендеринга (PDF/изображения/Office)
- `web/` - Frontend (React + Vite)

## Документация

- [QUICKSTART.md](./QUICKSTART.md) - Подробное руководство по запуску
- [CHANGELOG.md](./CHANGELOG.md) - Детальный changelog по этапам
- [TEST_CASES.md](./TEST_CASES.md) - Список тест-кейсов
- [Documentation.txt](./Documentation.txt) - Полное техническое задание

## API Endpoints

### Uploads
- `POST /uploads` - Инициализация загрузки
- `POST /uploads/:id/parts` - Получение presigned URL для части
- `POST /uploads/:id/complete` - Завершение загрузки
- `POST /uploads/:id/abort` - Отмена загрузки

### Assets
- `GET /assets` - Список активов (с фильтрами и поиском)
- `GET /assets/:id` - Детали актива
- `GET /assets/:id/versions` - Версии актива
- `GET /download/:versionId` - Presigned URL для скачивания

### Renditions
- `GET /renditions/:versionId` - Рендишены версии

### Annotations & Comments
- `GET /annotations?versionId=...` - Список аннотаций
- `POST /annotations` - Создание аннотации
- `GET /comments/threads?versionId=...` - Список тредов
- `POST /comments/threads/:id/comments` - Создание комментария

## Команды

### API
- `bun run dev` - запуск в dev режиме
- `bun run db:migrate` - выполнение миграций
- `bun run db:generate` - генерация миграций
- `bun run seed` - заполнение тестовыми данными
- `bun run lint` - проверка кода

### Worker
- `bun run dev` - запуск в dev режиме
- `bun run lint` - проверка кода

### Web
- `bun run dev` - запуск dev сервера (http://localhost:5173)
- `bun run build` - сборка для production
- `bun run lint` - проверка кода

## Известные ограничения

1. Аутентификация использует простой JWT (нет реального OAuth2/OIDC)
2. ACL проверки не полностью реализованы
3. Аудит логирование не реализовано
4. PDF Viewer нуждается в доработке
5. UI для аннотаций не реализован полностью
6. DeepZoom формат не полностью реализован

## Лицензия

MIT
