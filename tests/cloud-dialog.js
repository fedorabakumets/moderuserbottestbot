/**
 * @fileoverview Облачная проверка очистки диалога без удаления реальных сообщений.
 */
import { db } from 'sdk';
import { eq } from 'sdk/db';
import { dialogMessages } from '../schema.js';
import { rememberMessage, removeMessages, withCleanDialog } from '../lib/dialog.js';
import { deleted, failures } from '../lib/cleanup-api.js';

/**
 * Проверяет условие сценария.
 * @param {boolean} value - Проверяемое условие.
 * @param {string} text - Описание проверки.
 * @returns {void} Отсутствие результата.
 */
function check(value, text) { if (!value) throw new Error(text); console.log('Проверка пройдена:', text); }

/**
 * Возвращает отслеживаемые сообщения тестового чата.
 * @param {number} chatId - Идентификатор тестового чата.
 * @returns {Promise<Array>} Сообщения чата.
 */
async function tracked(chatId) {
  return db.select().from(dialogMessages).where(eq(dialogMessages.chatId, chatId)).all();
}

/**
 * Проверяет удаление предыдущего шага, вводов и обработку ошибок.
 * @returns {Promise<object>} Итог проверки.
 */
export default async function verifyDialog() {
  const chatId = -Date.now();
  try {
    await rememberMessage(chatId, { message_id: 11 });
    await rememberMessage(chatId - 1, { message_id: 11 });
    await withCleanDialog(chatId, 10, async () => {
      await rememberMessage(chatId, { message_id: 12 });
      return rememberMessage(chatId, { message_id: 13 });
    });
    check(deleted.map((item) => item.message_id).join(',') === '11,10', 'Предыдущий вопрос и ответ пользователя удаляются');
    check((await tracked(chatId)).length === 2, 'Фото и подтверждение нового шага сохраняются вместе');
    check((await tracked(chatId - 1)).length === 1, 'Сообщения другого чата не затронуты');
    deleted.length = 0;
    await withCleanDialog(chatId, 13, () => rememberMessage(chatId, { message_id: 14 }));
    check(deleted.length === 2, 'Нажатая кнопка и весь предыдущий шаг удаляются без дубликатов');
    deleted.length = 0;
    await withCleanDialog(chatId, 15, async () => undefined);
    check(deleted.length === 0, 'Без нового ответа предыдущий шаг остаётся');
    try {
      await withCleanDialog(chatId, 15, async () => { throw new Error('Тестовая ошибка действия'); });
    } catch {}
    check(deleted.length === 0 && (await tracked(chatId))[0].messageId === 14, 'Ошибка действия не уничтожает предыдущий шаг');
    await rememberMessage(chatId, { message_id: 16 });
    failures[16] = 400;
    await removeMessages(chatId, [16]);
    check(!(await tracked(chatId)).some((item) => item.messageId === 16), 'Уже удалённое сообщение не мешает очистке');
    failures[14] = 429;
    await removeMessages(chatId, [14, 14, -1, undefined]);
    check((await tracked(chatId)).length === 1, 'Временная ошибка сохраняет сообщение для следующей попытки');
    delete failures[14];
    await removeMessages(chatId, [14]);
    check((await tracked(chatId)).length === 0, 'Повторная попытка удаляет отложенное сообщение');
    return { passed: 9 };
  } finally {
    await db.delete(dialogMessages).where(eq(dialogMessages.chatId, chatId)).run();
    await db.delete(dialogMessages).where(eq(dialogMessages.chatId, chatId - 1)).run();
  }
}
