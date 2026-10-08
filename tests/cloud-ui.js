/**
 * @fileoverview Замена интерфейса для облачных проверок без отправки сообщений.
 */

/**
 * Возвращает тестовую кнопку.
 * @param {string} text - Подпись кнопки.
 * @param {string} data - Данные действия.
 * @returns {object} Тестовая кнопка.
 */
export function button(text, data) { return { text, callback_data: data }; }

/**
 * Имитирует отправку сообщения без обращения к Telegram Bot API.
 * @param {number} chatId - Идентификатор тестового получателя.
 * @param {string} text - Текст сообщения.
 * @param {Array} rows - Кнопки сообщения.
 * @returns {Promise<object>} Тестовое сообщение.
 */
export async function say(chatId, text, rows = []) { return { message_id: 7, chatId, text, rows }; }

/**
 * Имитирует показ анкеты или меню.
 * @param {object|number} input - Анкета или идентификатор пользователя.
 * @param {object} profile - Дополнительная анкета.
 * @returns {Promise<object>} Результат имитации показа.
 */
export async function showMenu(input, profile) { return { message_id: 7, input, profile }; }
export { showMenu as showCard };
