/**
 * @fileoverview Схема счётчиков для проверки постоянного хранилища Telegram.
 */
import { table, integer } from 'sdk/db';

/** Счётчики тестовых команд в личных чатах. */
export const serverlessTestCounters = table('serverless_test_counters', {
  /** Идентификатор чата, которому принадлежит счётчик. */
  chatId: integer('chat_id').primaryKey(),
  /** Число обработанных тестовых команд. */
  seen: integer('seen').notNull().default(0),
});
