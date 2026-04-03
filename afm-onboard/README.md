# AFM Onboard - Платформа обучения сотрудников АФМ

Веб-платформа для дистанционного обучения и тестирования сотрудников Агентства Финансового Мониторинга (АФМ).

## Быстрый старт

### Предварительные требования

- Node.js 18+ 
- PostgreSQL 14+
- Docker и Docker Compose (опционально)

### Установка и запуск

1. **Клонирование репозитория** (пропустите клонирование, если вы используете zip файл)
   ```bash
   git clone <repository-url>
   cd afm-onboard
   ```

2. **Настройка переменных окружения**
   ```bash
   cp .env.example .env
   # Отредактируйте .env файл с вашими настройками
   ```
   **Пример .env**
   NODE_ENV=development
   PORT=8080
   DATABASE_URL="postgresql://postgres:b1315bdf1ff04ad5b303705bffe07f5a@127.0.0.1:5432/afm?schema=public"
   JWT_ACCESS_TTL=15m
   JWT_REFRESH_TTL=30d
   JWT_SECRET="b2f7f4a8e7c14f4db8a1b3c9d5e2f6a1c4d9e8b7a6f5d4c3b2a1908f7e6d5c4b"
   BCRYPT_ROUNDS=12
   SMTP_HOST=
   SMTP_PORT=465
   SMTP_USER=
   SMTP_PASS=
   MAX_UPLOAD_MB=200
   RATE_LIMIT_AUTH=10
   RATE_LIMIT_GENERAL=60
   PRISMA_CLIENT_ENGINE_TYPE=wasm

3. **Установка зависимостей**
   ```bash
   # Установка зависимостей для всего проекта
   npm install
   
   # Или отдельно для backend и frontend
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Настройка базы данных**
   Если вы разворачиваете проект из ZIP с готовым дампом БД, миграции и сиды не требуются. См. раздел «Развёртывание из ZIP и восстановление БД» ниже.

5. **Запуск в режиме разработки**
   ```bash
   # Запуск backend (порт 3000)
   cd backend && npm run start:dev
   
   # Запуск frontend (порт 5173)
   cd frontend && npm run dev
   ```

### Публикация локальной разработки через ngrok (без контейнеризации)

1. Установите ngrok (один раз):
   - Скачайте с сайта (`https://ngrok.com/download`) для Windows и добавьте `ngrok.exe` в `PATH`, либо поместите рядом с проектом.
   - Войдите в аккаунт и получите Authtoken в личном кабинете.
   - Привяжите токен:
     ```bash
     ngrok config add-authtoken <ВАШ_AUTHTOKEN>
     ```

2. Подготовьте окружение фронтенда (если хотите, чтобы фронтенд обращался к бэкенду по ngrok‑домену):
   ```bash
   cp frontend/.env.local.example frontend/.env.local
   # Откройте frontend/.env.local и при необходимости укажите VITE_API_URL=https://<backend-subdomain>.ngrok-free.app/api/v1
   ```

3. Запустите приложения локально (в отдельных терминалах или параллельно):
   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

4. Откройте туннели ngrok:
   ```bash
   # Оба туннеля из заранее подготовленного ngrok.yml
   npm run ngrok:start
   # или по отдельности
   npm run ngrok:backend
   npm run ngrok:frontend
   ```

5. Скопируйте выданные HTTPS‑ссылки:
   - Frontend (порт 5173) → публичный URL для интерфейса
   - Backend (порт 8080) → публичный API URL (например, для VITE_API_URL)

Примечания:
- Конфигурация туннелей находится в `ngrok.yml` (frontend:5173, backend:8080).
- Для корректного формирования ссылок на загрузки медиа фронтенд использует `VITE_API_URL`. Для публичного доступа обязательно укажите HTTPS‑адрес бэкенда из ngrok (например, `https://<backend-subdomain>.ngrok-free.app/api/v1`). Значение `http://localhost:8080/api/v1` будет работать только на вашей машине.
- Если корпоративная сеть блокирует ngrok, используйте режим с одним туннелем (только фронтенд) и прокиньте CORS в браузере, либо согласуйте правила с ИБ.

### Быстрая смена адреса API на фронтенде (runtime override)

- Можно переопределить адрес API без пересборки: добавьте к URL фронтенда параметр `?api=`:
  - Пример: `https://<frontend-ngrok>.ngrok-free.app/?api=https://<backend-ngrok>.ngrok-free.app/api/v1`
- Этот адрес сохраняется в `localStorage` под ключом `AFM_API_URL`. Чтобы сбросить — удалите ключ в DevTools или откройте с пустым `?api=`.
- По умолчанию фронтенд обращается к `/api/v1` (через Vite proxy), поэтому в dev-режиме любые устройства, открывающие фронтенд по ngrok, смогут обращаться к бэкенду через прокси без CORS.

### Запуск через Docker

```bash
# Запуск всех сервисов
docker compose up -d

# Просмотр логов
docker compose logs -f
```

## Структура проекта

```
afm-onboard/
├── backend/                 # NestJS API сервер
│   ├── src/
│   │   ├── auth/           # Аутентификация и авторизация
│   │   ├── users/          # Управление пользователями
│   │   ├── courses/        # Управление курсами
│   │   ├── chapters/       # Управление главами
│   │   ├── lessons/        # Управление уроками
│   │   ├── tests/          # Управление тестами
│   │   ├── reports/        # Отчеты и аналитика
│   │   └── uploads/        # Загрузка файлов
│   ├── prisma/             # Схема базы данных и миграции
│   └── uploads/            # Загруженные файлы
├── frontend/               # React приложение
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── store/          # Zustand store
│   │   └── lib/            # Утилиты и API
│   └── public/             # Статические файлы
├── scripts/                # Вспомогательные скрипты
└── docker-compose.yml      # Docker конфигурация
```

## Конфигурация

### Переменные окружения

Основные переменные окружения (см. `.env.example`):

- `DATABASE_URL` - URL подключения к PostgreSQL
- `JWT_SECRET` - Секретный ключ для JWT токенов
- `SMTP_*` - Настройки SMTP для отправки email

### База данных

Проект использует PostgreSQL с Prisma ORM. Основные таблицы:

- `users` - Пользователи системы
- `courses` - Курсы обучения
- `chapters` - Главы курсов
- `lessons` - Уроки глав
- `tests` - Тесты
- `test_attempts` - Попытки прохождения тестов

## Роли пользователей

1. **Гость** - может регистрироваться в системе
2. **Сотрудник** - может изучать материалы и проходить тесты
3. **Администратор** - полный доступ к управлению системой

## Тестирование

```bash
# Backend тесты
cd backend
npm run test
npm run test:e2e

# Frontend тесты
cd frontend
npm run test
```

## Отчеты

Система предоставляет следующие отчеты:

- Прогресс обучения по сотрудникам
- Результаты тестирования
- Статистика прохождения курсов
- Аудит действий администраторов

## Безопасность

- JWT аутентификация
- Шифрование паролей (bcrypt)
- Rate limiting
- Валидация входных данных
- Защита от SQL инъекций
- CORS настройки

## Развертывание

### Production

1. Настройте переменные окружения для production
2. Выполните миграции базы данных
3. Соберите frontend: `npm run build`
4. Запустите backend: `npm run start:prod`

### Docker Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Развёртывание из ZIP и восстановление БД из дампа

Ниже — чек‑лист для развёртывания проекта на сервере из ZIP‑архива с использованием готового дампа PostgreSQL.

### 1) Подготовка окружения

- Установите Docker и Docker Compose V2
- Убедитесь, что порты 5432 (Postgres), 8080 (backend), 5173 (frontend), 9000/9001 (MinIO) доступны

### 2) Распаковка и структура

- Распакуйте архив в директорию, например `/opt/afm-onboard`
- Проверьте наличие папки `dump/` с файлом дампа `*.dump`

### 3) Переменные окружения

- Для локального запуска: `backend/.env`
- Для Docker: уже подготовлен `backend/.env.docker` (использует хост `db`)

### 4) Запуск инфраструктуры

```bash
docker compose up -d db minio
```

Проверьте готовность БД:

```bash
docker compose exec -T db pg_isready -U postgres -d afm
```

### 5) Восстановление базы из дампа

Предварительно создайте папку `dump/` и поместите в неё файл дампа, если его нет:

```bash
mkdir -p dump
```

Восстановите БД (замените `FILENAME.dump` на ваш файл):

```bash
docker compose exec -T db bash -lc 'export PGPASSWORD="b1315bdf1ff04ad5b303705bffe07f5a"; pg_restore -U postgres -d afm -c -1' < dump/FILENAME.dump
```

Проверка таблиц:

```bash
docker compose exec -it db psql -U postgres -d afm -c "\dt"
```

### 6) Запуск приложений

```bash
docker compose up -d backend frontend
```

Доступ:

- Backend API: http://SERVER_IP:8080
- Frontend: http://SERVER_IP:5173
- MinIO Console: http://SERVER_IP:9001 (логин/пароль: `minioadmin`/`minioadmin`)

### 7) Создание дампа (бэкап) на сервере

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p dump
docker compose exec -T db bash -lc 'export PGPASSWORD="b1315bdf1ff04ad5b303705bffe07f5a"; pg_dump -U postgres -d afm -Fc' > dump/afm_${TIMESTAMP}.dump
```

### 8) Обновление базы через Prisma (опционально)

Если структура данных изменилась, можно выполнить:

```bash
docker compose exec -it backend npm run prisma:migrate --workspace backend
docker compose exec -it backend npx prisma generate
```

## Лицензия

Проект разработан для Агентства Финансового Мониторинга РК.

## Поддержка

По вопросам поддержки обращайтесь к команде разработки.
