/**
 * @fileoverview Клавиатуры, сообщения и отображение медиаанкет.
 */
import { api } from 'sdk';

/**
 * Создаёт inline-кнопку.
 * @param {string} text - Подпись кнопки.
 * @param {string} data - Данные действия.
 * @returns {object} Кнопка Telegram.
 */
export function button(text, data) { return { text, callback_data: data }; }

/**
 * Отправляет текст с необязательной inline-клавиатурой.
 * @param {number} chatId - Идентификатор чата.
 * @param {string} text - Текст сообщения.
 * @param {Array} rows - Строки кнопок.
 * @returns {Promise<object>} Отправленное сообщение.
 */
export async function say(chatId, text, rows = []) {
  return api.sendMessage({ chat_id: chatId, text, reply_markup: { inline_keyboard: rows } });
}

/**
 * Показывает главное меню.
 * @param {object} profile - Анкета пользователя.
 * @returns {Promise<object>} Сообщение меню.
 */
export async function showMenu(profile) {
  return say(profile.userId, `🐱 Котик\nТвоя анкета ${profile.active ? 'участвует в поиске' : 'скрыта'}.`, [
    [button('🔎 Смотреть анкеты', 'browse'), button('👤 Моя анкета', 'mine')],
    [button('✏️ Изменить анкету', 'edit'), button('💕 Симпатии', 'matches')],
    [button(profile.active ? '🙈 Скрыть анкету' : '👀 Вернуть в поиск', 'visibility')],
    [button('🗑 Удалить анкету', 'delete')],
  ]);
}

/**
 * Отправляет карточку анкеты с медиа и кнопками.
 * @param {number} chatId - Идентификатор получателя.
 * @param {object} profile - Анкета для показа.
 * @param {Array} rows - Строки кнопок.
 * @returns {Promise<object>} Отправленная карточка.
 */
export async function showCard(chatId, profile, rows = []) {
  const caption = `🐱 ${profile.name}, ${profile.age}, ${profile.city}\n${profile.bio || 'Без описания'}`;
  const payload = { chat_id: chatId, caption, reply_markup: { inline_keyboard: rows } };
  return profile.mediaType === 'video'
    ? api.sendVideo({ ...payload, video: profile.mediaId })
    : api.sendPhoto({ ...payload, photo: profile.mediaId });
}
