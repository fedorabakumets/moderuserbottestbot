<!--
/**
 * @fileoverview Инструкция по разработке и проверке тестового бота Telegram Serverless.
 */
-->
# moderuserbottestbot

Тестовый бот [@moderuserbottestbot](https://t.me/moderuserbottestbot), работающий на Telegram Serverless.

## Команды бота

- `/start` — подсказка по использованию.
- `/serverless_test` — увеличивает счётчик личного чата в базе SQLite и показывает версию обработчика.

Счётчики сохраняются между вызовами и обновлениями кода. Старые платёжные команды в этом проекте не реализованы.

## Подключение и запуск

Нужен Node.js версии 18 или новее. В BotFather откройте бота, включите Serverless и получите отдельный токен в разделе CLI Access.

```powershell
npm ci
npx tgcloud login
npm run status
```

Токен вводится в приглашении CLI. Не добавляйте его в исходники или GitHub. Папки `.tgcloud/` и `node_modules/` исключены из Git.

## Развёртывание

```powershell
npm run deploy
npx tgcloud migrate --safe
```

Развёртывание кода и применение схемы базы — отдельные действия. `--safe` применяет только безопасные изменения схемы.

После развёртывания отправьте боту `/serverless_test` дважды: счётчик должен увеличиться. Измените версию ответа в обработчике, разверните его повторно и проверьте, что счётчик продолжился.

## Структура проекта

- `tgcloud/schema.js` — таблица счётчиков.
- `tgcloud/lib/counter.js` — атомарное увеличение счётчика.
- `tgcloud/handlers/message.js` — обработчик сообщений в личных чатах.
- `tgcloud.jsonc` — конфигурация проекта.
- `docs/tgcloud-sdk.md` — справочник SDK из официального шаблона.

Новые комментарии и JSDoc пишутся на русском языке.

Документация платформы: [Telegram Serverless](https://core.telegram.org/bots/serverless).
