# Changelog

## Этап 1 - Репо и инфраструктура ✅

### Созданные файлы:
- `api/package.json`, `api/tsconfig.json`, `api/biome.json`
- `worker/package.json`, `worker/tsconfig.json`, `worker/biome.json`
- `web/package.json`, `web/tsconfig.json`, `web/biome.json`
- `.env.example`, `.gitignore`, `README.md`

### Команды:
- `bun run dev` - запуск в dev режиме (api, worker, web)
- `bun run db:migrate` - выполнение миграций
- `bun run db:generate` - генерация миграций
- `bun run lint` - проверка кода

## Этап 2 - БД и Drizzle ✅

### Созданные файлы:
- `api/src/db/schema.ts` - схемы всех таблиц
- `api/src/db/index.ts` - подключение к БД
- `api/src/db/drizzle.config.ts` - конфиг drizzle-kit
- `api/src/db/migrate.ts` - скрипт миграций
- `api/src/db/dao/*.ts` - DAO функции для всех сущностей

### Таблицы:
- `assets` - основные активы
- `asset_versions` - версии файлов
- `upload_sessions` - сессии загрузки
- `renditions` - рендишены (превью, тайлы)
- `annotations` - аннотации
- `comment_threads` - треды комментариев
- `comments` - комментарии
- `permissions` - права доступа

### Индексы:
- По типу, статусу, тегам (GIN), заголовку

## Этап 3 - Upload API ✅

### Созданные файлы:
- `api/src/routes/uploads.ts` - эндпоинты загрузки
- `api/src/services/s3.ts` - интеграция с MinIO
- `api/src/services/redis.ts` - очередь задач

### Эндпоинты:
- `POST /uploads` - инициализация загрузки
- `POST /uploads/:id/parts` - получение presigned URL для части
- `POST /uploads/:id/complete` - завершение multipart upload
- `POST /uploads/:id/abort` - отмена загрузки

### Особенности:
- Multipart upload с частями по 5MB
- Идемпотентность complete
- Интеграция с MinIO S3 API
- Очередь рендеринга через Redis

## Этап 4 - Assets API ✅

### Созданные файлы:
- `api/src/routes/assets.ts` - CRUD для активов
- `api/src/routes/renditions.ts` - получение рендишенов
- `api/src/middleware/auth.ts` - JWT аутентификация

### Эндпоинты:
- `GET /assets` - список с фильтрами и поиском
- `GET /assets/:id` - детали актива
- `GET /assets/:id/versions` - версии актива
- `GET /download/:versionId` - presigned URL для скачивания
- `GET /renditions/:versionId` - рендишены версии

### Поиск:
- По заголовку/описанию (ILIKE)
- По типу, статусу, тегам
- Пагинация

## Этап 5 - Worker ✅

### Созданные файлы:
- `worker/src/index.ts` - основной цикл worker
- `worker/src/services/render.ts` - рендеринг PDF/изображений
- `worker/src/services/s3.ts` - работа с S3

### Функциональность:
- Обработка очереди `queue:preview` из Redis
- PDF → превью страниц (512/1024/2048px)
- Изображения → превью + DeepZoom тайлы
- Office → PDF через LibreOffice → превью
- Загрузка рендишенов в MinIO
- Dead Letter Queue для ошибок

## Этап 6 - Web UI ✅

### Созданные файлы:
- `web/src/pages/UploadPage.tsx` - страница загрузки
- `web/src/pages/AssetsList.tsx` - список активов
- `web/src/pages/AssetViewer.tsx` - просмотр актива
- `web/src/components/PDFViewer.tsx` - просмотр PDF
- `web/src/components/ImageViewer.tsx` - просмотр изображений
- `web/src/lib/api.ts` - API клиент

### Функциональность:
- Drag & drop загрузка
- Параллельная загрузка частей (6 одновременных)
- Прогресс-бары
- Поиск и фильтры
- Базовый просмотр PDF и изображений

## Этап 7 - Безопасность и аудит ⚠️

### Созданные файлы:
- `api/src/utils/mime.ts` - валидация MIME типов
- `api/src/middleware/security.ts` - проверка безопасности

### Реализовано:
- ✅ Whitelist разрешенных MIME типов
- ✅ Блокировка исполняемых файлов по расширению
- ✅ Проверка MIME при загрузке

### TODO:
- ⚠️ Проверка magic bytes (базовая реализация есть)
- ⚠️ ACL проверки на уровне asset/project
- ⚠️ Аудит логирование действий

## Известные ограничения

1. **Аутентификация**: Используется простой JWT, нет реального OAuth2/OIDC провайдера
2. **ACL**: Базовая структура есть, но проверки не полностью реализованы
3. **Аудит**: Структура таблиц есть, но логирование не реализовано
4. **PDF Viewer**: Базовый просмотр, нужна доработка для полной функциональности
5. **Аннотации**: API есть, но UI компонент не реализован
6. **DeepZoom**: Базовые тайлы генерируются, но формат DZI не реализован полностью

## Next Steps

1. Реализовать полноценный UI для аннотаций с Konva
2. Добавить аудит логирование всех действий
3. Реализовать ACL проверки
4. Улучшить PDF viewer с полной поддержкой PDF.js
5. Добавить тесты (unit + integration)
6. Настроить CI/CD

