/**
 * @fileoverview Обработчик проверки кода и базы данных Telegram Serverless.
 */
import { api } from 'sdk';
import { incrementCounter } from '../lib/counter.js';

/**
 * Обрабатывает тестовую команду в личном чате.
 * @param {object} message - Входящее сообщение Telegram.
 * @returns {Promise<object|undefined>} Результат теста или отсутствие действия.
 */
export default async function handleMessage(message) {
  if (message.chat?.type !== 'private') return;
  const command = message.text?.trim().split(/\s+/)[0].split('@')[0];
  if (command === '/start') {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: 'Тест Telegram Serverless. Отправь /serverless_test — проверим код и базу данных.',
    });
    return;
  }
  if (command !== '/serverless_test') return;
  const count = await incrementCounter(message.chat.id);
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `Telegram Serverless работает ✅\nСчётчик в базе: ${count}\nВерсия теста: 2`,
  });
  return { count, version: 2 };
}
