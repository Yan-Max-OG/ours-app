# OURS

A little world. Just for two.

Рабочий MVP Telegram Mini App: совместные планы, благодарности, места, настроение, воспоминания и маленькие ритуалы. Mobile-first интерфейс с редакционной композицией, пятью темами и лёгким motion. Обычный браузер открывает **отдельное демопространство Yan + Sofia**. Настоящий запуск внутри Telegram использует серверную авторизацию и вашу базу Supabase.

## Что работает

- Today: следующий план, дни вместе, настроение, задачи, благодарность, воспоминание.
- Plans: создание/изменение/удаление задач, назначение, приоритет, дата/время, checklist, повторяемость, четыре представления, свайпы и мгновенное обновление с откатом при ошибке. Календарь и ритуалы.
- Gratitude: запечатанная записка, отложенное открытие, реакции, история. Love Inbox для коротких сообщений.
- Places: фото, адрес, ссылка, категория, бюджет, посещение и случайный выбор с фильтрами.
- Memories и timeline: фото, описание, дата и место. Выполненный bucket item создаёт memory.
- Mood: ежедневный check-in, social battery, заметка, правила видимости.
- Date generator: бюджет/время/энергия/погода, последовательность вечера и сохранение в календарь. Это локальный генератор идей, не бронирование и не прогноз погоды.
- Daily questions, weekly pulse, this-or-that: ответы скрыты от партнёра до взаимного завершения. Conversation cards с переворотом и свайпом.
- Goals: числовая цель, деньги, проценты, счётчик шагов. Wishlist с private. Time capsules и surprise events.
- Лёгкая декоративная gamification, badges, интерактивная SVG constellation, ежемесячная история и экспорт PNG карточки через системный share либо download.
- Settings: начало отношений, тема, quieter motion, privacy, notification preferences, quiet hours, export, disconnect и удаление аккаунта.
- Backend: Telegram HMAC validation, подписанные 12-часовые сессии, атомарный pairing, 192-bit invite, RLS, серверная изоляция пары, приватный Storage, rate limits, очередь уведомлений и защищённый cron endpoint.

## Границы этой версии

Это существенный работающий MVP, но не утверждение, что все 55 пунктов исходного ТЗ полностью завершены и проверены на реальных телефонах. Точный список дальнейших улучшений — в `docs/RELEASE.md`. В частности: пока один основной снимок на memory; обновления партнёра приходят опросом раз в 8 секунд; интерфейс на английском; world — лёгкая SVG-сцена; goals типа checklist считают шаги; live Supabase/Telegram delivery и публичный запуск требуют ваших credentials. Демо локальное: не используйте его для приватных реальных сообщений.

## 1. Что установить

1. Node.js 22.13 или новее (для встроенных тестов рекомендуется Node 24).
2. pnpm: `corepack enable`, затем `corepack prepare pnpm@11.19.0 --activate`.
3. Редактор, например VS Code.
4. Аккаунт Supabase. Для настоящего Telegram-flow нужен Telegram.
5. Для самостоятельного Cloudflare deployment — аккаунт Cloudflare. Для локальной БД опционально Supabase CLI + Docker.

Откройте терминал **в папке проекта OURS**.

```sh
pnpm install
pnpm dev
```

Если pnpm просит разрешить build scripts, выполните `pnpm approve-builds` и разрешите известные зависимости scaffold: esbuild, sharp, workerd. Не отключайте общую проверку зависимостей.

Откройте адрес, показанный терминалом (обычно http://localhost:3000). Сервер должен оставаться запущенным.

## 2. Демо вне Telegram

Демо запускается автоматически вне Telegram. Это отдельные localStorage-данные, не имитация серверной авторизации. На всех экранах видна отметка DEMO SPACE. Создавайте записи, закрывайте задачи, пробуйте темы. В US → Make it ours есть кнопка **Demo: become Sofia / Yan**: можно ответить на вопрос за обоих, открыть благодарность и проверить privacy.

Для сброса демо удалите ключ `ours-demo-v1` в localStorage либо используйте Delete my account в демо. Экспорт доступен в Settings. Не вводите реальные секретные сообщения в демо: данные хранятся в браузере и доступны владельцу устройства.

## 3. Создать бота

1. Откройте **проверенный @BotFather** в Telegram.
2. Отправьте `/newbot`, задайте отображаемое имя и уникальный username, заканчивающийся на `bot`.
3. BotFather вернёт bot token. Сохраните его как серверную переменную `TELEGRAM_BOT_TOKEN`.
4. Username без `@` сохраните в `TELEGRAM_BOT_USERNAME`.
5. Никогда не вставляйте token в чат, frontend-код, URL, git или публичные переменные `VITE_`/`NEXT_PUBLIC_`.

## 4. Создать базу Supabase

1. Создайте новый проект в Supabase Dashboard и сохраните пароль БД.
2. В Settings / API скопируйте Project URL → `SUPABASE_URL` и серверный service-role key → `SUPABASE_SERVICE_ROLE_KEY`.
3. Откройте SQL Editor и выполните весь файл `supabase/migrations/001_ours.sql` **один раз на новой БД**. Он создаёт таблицы, индексы, функции, RLS, private bucket и очередь уведомлений.
4. Проверьте, что bucket `ours-photos` имеет `public = false`.
5. Не добавляйте permissive anon-политики. Клиент не должен напрямую использовать service role. Небезопасные записи и закрытое содержимое доступны только через проверенный API gateway.

Альтернатива через CLI:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Нужен стандартный `supabase init` для конфигурации CLI, если в вашем окружении его ещё нет; миграция находится в стандартной папке. Не запускайте её поверх уже созданных таблиц повторно.

## 5. Переменные окружения

Скопируйте `.env.example` в `.env` (на сервере используйте secret manager вашего хостинга):

| Переменная                  | Значение                                             |
| --------------------------- | ---------------------------------------------------- |
| `SUPABASE_URL`              | HTTPS URL проекта Supabase                           |
| `SUPABASE_SERVICE_ROLE_KEY` | Серверный service-role key                           |
| `TELEGRAM_BOT_TOKEN`        | Token из BotFather                                   |
| `TELEGRAM_BOT_USERNAME`     | Username без @                                       |
| `APP_ORIGIN`                | Точный HTTPS origin приложения, без завершающего `/` |
| `SESSION_SECRET`            | Случайный отдельный секрет, минимум 32 байта         |
| `CRON_SECRET`               | Второй случайный секрет, минимум 32 байта            |

Получить два разных секрета можно дважды вызвав:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Ни один из этих секретов не является frontend-переменной. `.env` исключён из git. После изменения локальных переменных перезапустите dev server. На хостинге нужно заново запустить deployment с нужными bindings.

## 6. Main Mini App и production URL

1. Сначала разместите приложение по общедоступному HTTPS URL. Приватный Sites preview, защищённый входом владельца, подходит для просмотра, но **не является публичным Telegram production URL**.
2. В @BotFather откройте `/mybots` → ваш бот → Bot Settings → Configure Mini App / Main Mini App (названия пунктов могут отличаться в клиенте).
3. Включите Main Mini App и укажите HTTPS URL приложения. Здесь же можно добавить описание, иконку и изображения запуска.
4. По желанию настройте кнопку меню через `/setmenubutton` на тот же URL.
5. Значение `APP_ORIGIN` должно точно совпадать с origin этого URL.
6. Откройте профиль бота и нажмите Launch/Open App. Приложение отправит `Telegram.WebApp.initData` серверу, проверит подпись и создаст внутренний user UUID. `initDataUnsafe` не используется для авторизации.

Официальная документация Telegram: https://core.telegram.org/bots/webapps и https://core.telegram.org/bots/features.

## 7. Проверить внутри Telegram локальную версию

Используйте HTTPS tunnel к localhost:3000 (например, ваш привычный ngrok/cloudflared). Укажите его origin в `.env` и временно в BotFather. Перезапустите сервер. Откройте Mini App **из Telegram**, а не прямую ссылку обычного браузера. Никогда не добавляйте dev-auth endpoint на production для обхода подписи.

## 8. Пригласить партнёра

У нового пользователя появляется onboarding. На последнем шаге Create our space создаёт couple и одноразовый token. Копируется ссылка вида:

```
https://t.me/YOUR_BOT_USERNAME?startapp=invite_<random-token>
```

Ссылка действует 48 часов. В БД хранится SHA-256 digest, а не raw token. Второй человек открывает ссылку, видит имя приглашающего и подтверждает создание пространства. После его согласия пара связана. Первый человек увидит обновление автоматически. Одновременно принадлежать двум активным парам нельзя. Новая ссылка аннулирует предыдущую. Disconnect закрывает активное членство обоим.

## 9. Deployment

Проект использует платформенный React/Vite/Vinext scaffold. Это не обычный static export: API routes необходимы для Telegram. Не публикуйте только frontend как полноценную защищённую production-версию.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Сборка создаёт Cloudflare-compatible Worker в `dist/server/index.js` и frontend assets. Для собственного Cloudflare аккаунта добавьте секреты с помощью Wrangler, используя сгенерированную конфигурацию:

```sh
pnpm exec wrangler secret put SUPABASE_URL --config dist/server/wrangler.json
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config dist/server/wrangler.json
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --config dist/server/wrangler.json
pnpm exec wrangler secret put TELEGRAM_BOT_USERNAME --config dist/server/wrangler.json
pnpm exec wrangler secret put SESSION_SECRET --config dist/server/wrangler.json
pnpm exec wrangler secret put CRON_SECRET --config dist/server/wrangler.json
pnpm exec wrangler secret put APP_ORIGIN --config dist/server/wrangler.json
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

Перед этим проверьте имя Worker и account в конфигурации вашего аккаунта. Платформенное приватное размещение Sites управляется отдельно. Для independent production с долгосрочной поддержкой оцените переход платформенного Vinext beta на стабильный Next.js; серверные Web API и React-компоненты специально изолированы для такого переноса.

## 10. Bot notifications

Пользователь включает notifications в Settings. В Telegram вызывается `requestWriteAccess`; отказ уважается. Без согласия запись в очередь не создаётся. В демо ничего не отправляется.

Обработчик очереди: `POST /api/ours/cron` с заголовком `Authorization: Bearer <CRON_SECRET>`. Его должен вызывать ваш scheduler раз в минуту. Можно использовать внешний scheduler или отдельный Cloudflare Worker с Cron Trigger. Секрет передавайте только через секреты scheduler, никогда в query string.

```js
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch(env.APP_ORIGIN + '/api/ours/cron', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.CRON_SECRET },
      }).then((response) => {
        if (!response.ok) throw new Error('OURS notification job failed');
      }),
    );
  },
};
```

Настройте расписание `* * * * *` в Cron Triggers отдельного Worker. Quiet hours учитывают IANA timezone пользователя. Есть блокировка очереди, retry/backoff и предел попыток. Не более одного уведомления пользователю за 30 минут. Telegram Bot API не имеет idempotency key для sendMessage: при сбое после отправки, но до подтверждения БД возможно повторное уведомление. Сообщения всегда общие, без текста приватных записок. Event reminders пока рассчитываются от календарной даты; точный scheduling по времени события — следующий этап.

## 11. Проверки

`pnpm test` включает HMAC/session, tampering, expiry, invite entropy, private/reveal rules, validation, quiet hours и PostgreSQL integration. Последний тест запускает настоящий PostgreSQL engine через PGlite, применяет миграцию и проверяет pairing, повтор приглашения, task CRUD, RLS другой пары и disconnect. Supabase-specific auth/storage schemas воспроизводятся в тесте; реальный storage/bot transport нужно проверить отдельно.

Ручной двухаккаунтный acceptance checklist:

- A создаёт пространство; B принимает deep link; C не может стать третьим.
- A и B не могут повторно использовать приглашение или вступить во вторую пару.
- Создать задачу на A, дождаться появления на B; завершить на B; A видит обновление.
- Отключить сеть при сохранении: показать ошибку, откатить optimistic change, сохранить введённый текст формы.
- Создать capsule и surprise: проверить API state/export от B — body/image/details скрыты до срока.
- Ответить на вопрос только за A: B не видит ответ; после B — оба видят.
- Проверить private wishlist и mood privacy, в том числе прямой API запрос с чужим couple/item ID.
- Загрузить фотографию и проверить приватный signed URL; чужая пара не получает ссылку.
- Разрешить notifications, вызвать защищённый job, проверить quiet hours и отказ бота после блокировки.
- Проверить iOS/Android/Desktop/Web: safe areas, клавиатуру, BackButton, dark theme, reduced motion.
- Выполнить export, disconnect и delete в тестовой паре.

## Структура

- `components/ours/` — продуктовые экраны и формы.
- `components/ui/` — поставленные доступные UI-примитивы.
- `lib/ours/` — domain types, demo, repository, Telegram, security, permissions, notifications.
- `app/api/ours/[...path]/route.ts` — server gateway.
- `supabase/migrations/001_ours.sql` — схема, RLS, pairing, recurrence, queue.
- `tests/` — автоматические проверки.
- `docs/ARCHITECTURE.md` — решения и этапы.
- `docs/ASSETS.md` — источники демофотографий.
- `docs/RELEASE.md` — результаты проверки и оставшиеся ограничения.
