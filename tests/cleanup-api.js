/**
 * @fileoverview Имитация удаления сообщений для безопасных облачных проверок.
 */
export const deleted = [];
export const failures = {};

/** Тестовая часть Bot API для удаления сообщений. */
export const api = {
  /**
   * Запоминает запрос удаления и имитирует заданную ошибку.
   * @param {object} input - Чат и сообщение для удаления.
   * @returns {Promise<boolean>} Успешное удаление.
   */
  async deleteMessage(input) {
    deleted.push(input);
    if (failures[input.message_id]) throw { code: failures[input.message_id] };
    return true;
  },
};
