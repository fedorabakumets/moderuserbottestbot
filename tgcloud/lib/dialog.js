/**
 * @fileoverview Учёт сообщений шага и очистка диалога после успешного действия.
 */
import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { dialogMessages } from '../schema.js';

/**
 * Запоминает отправленное сообщение текущего шага.
 * @param {number} chatId - Идентификатор чата.
 * @param {object} message - Сообщение, возвращённое Bot API.
 * @returns {Promise<object>} Исходное сообщение.
 */
export async function rememberMessage(chatId, message) {
  try {
    await db.insert(dialogMessages).values({ key: `${chatId}:${message.message_id}`, chatId, messageId: message.message_id })
      .onConflictDoNothing({ target: dialogMessages.key }).run();
  } catch (error) {
    console.warn('Не удалось запомнить сообщение для очистки', error.code || error.message);
  }
  return message;
}

/**
 * Удаляет старые сообщения и не мешает диалогу при ограничениях Telegram.
 * @param {number} chatId - Идентификатор чата.
 * @param {Array<number>} messageIds - Идентификаторы старых сообщений.
 * @returns {Promise<void>} Завершение доступной очистки.
 */
export async function removeMessages(chatId, messageIds) {
  for (const messageId of new Set(messageIds.filter((id) => Number.isSafeInteger(id) && id > 0))) {
    try {
      await api.deleteMessage({ chat_id: chatId, message_id: messageId });
    } catch (error) {
      if (![400, 403].includes(error.code)) {
        console.warn('Не удалось удалить старое сообщение', messageId, error.code || error.message);
        continue;
      }
    }
    await db.delete(dialogMessages).where(eq(dialogMessages.key, `${chatId}:${messageId}`)).run();
  }
}

/**
 * Выполняет действие, затем удаляет предыдущий шаг и входящее сообщение.
 * @param {number} chatId - Идентификатор чата.
 * @param {number} triggerId - Ввод пользователя или сообщение с нажатой кнопкой.
 * @param {Function} action - Действие, создающее новый шаг.
 * @returns {Promise<unknown>} Результат выполненного действия.
 */
export async function withCleanDialog(chatId, triggerId, action) {
  const previous = await db.select().from(dialogMessages).where(eq(dialogMessages.chatId, chatId)).all();
  const result = await action();
  const current = await db.select().from(dialogMessages).where(eq(dialogMessages.chatId, chatId)).all();
  const oldIds = new Set(previous.map((message) => message.messageId));
  if (!current.some((message) => !oldIds.has(message.messageId))) return result;
  try {
    await removeMessages(chatId, [...oldIds, triggerId]);
  } catch (error) {
    console.warn('Очистка диалога отложена', error.code || error.message);
  }
  return result;
}
