/**
 * @fileoverview Увеличение счётчика одним атомарным запросом к базе данных.
 */
import { db } from 'sdk';
import { sql } from 'sdk/db';
import { serverlessTestCounters } from '../schema.js';

/**
 * Создаёт счётчик чата или увеличивает существующий.
 * @param {number} chatId - Идентификатор личного чата Telegram.
 * @returns {Promise<number>} Сохранённое значение счётчика.
 */
export async function incrementCounter(chatId) {
  const [row] = await db.insert(serverlessTestCounters)
    .values({ chatId, seen: 1 })
    .onConflictDoUpdate({
      target: serverlessTestCounters.chatId,
      set: { seen: sql`${serverlessTestCounters.seen} + 1` },
    })
    .returning()
    .run();
  return row.seen;
}
