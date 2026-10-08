/**
 * @fileoverview Проверка уведомлений о лайках, повторов и ошибки доставки без реальных рассылок.
 */
import { createFixtures, cleanupFixtures } from '../lib/test-fixtures.js';
import { getProfile, saveProfile } from '../lib/profiles.js';
import { recordDecisionWithStatus } from '../lib/dating.js';
import { getIncomingLikes } from '../lib/likes.js';
import { notifyDecision } from '../lib/notifications.js';
import { sentMessages, failNextMessage } from '../lib/ui.js';
let passed = 0;

/**
 * Проверяет ожидаемый результат уведомления.
 * @param {boolean} condition - Проверяемое условие.
 * @param {string} message - Название проверки.
 * @returns {void} Отсутствие результата.
 */
function check(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
  console.log('Проверка пройдена:', message);
}

/**
 * Проверяет уведомления на временных анкетах и удаляет данные после проверки.
 * @returns {Promise<object>} Количество успешных проверок.
 */
export default async function verifyNotifications() {
  const base = -Date.now();
  const ids = Array.from({ length: 5 }, (_, index) => base + index);
  try {
    await createFixtures(base);
    const sender = await getProfile(ids[0]), receiver = await getProfile(ids[1]);
    const first = await recordDecisionWithStatus(sender.userId, receiver.userId, 'like');
    check(first.inserted && !first.matched, 'Первый лайк отличается от повтора');
    check(await notifyDecision(sender, receiver, first, 'like'), 'Первый лайк отправляет уведомление');
    check(sentMessages.length === 1 && sentMessages[0].chatId === receiver.userId, 'Уведомление приходит только получателю');
    check(sentMessages[0].rows[0][0].callback_data === 'incoming', 'Уведомление открывает входящие анкеты');
    const repeated = await recordDecisionWithStatus(sender.userId, receiver.userId, 'like');
    check(!repeated.inserted && !await notifyDecision(sender, receiver, repeated, 'like') && sentMessages.length === 1,
      'Повторный лайк не дублирует уведомление');
    const mutual = await recordDecisionWithStatus(receiver.userId, sender.userId, 'like');
    await notifyDecision(receiver, sender, mutual, 'like');
    check(sentMessages.length === 3 && sentMessages.slice(1).every(message => message.text.includes('Взаимная симпатия')),
      'Ответный лайк отправляет только два уведомления о взаимности');
    const duplicate = await recordDecisionWithStatus(receiver.userId, sender.userId, 'like');
    await notifyDecision(receiver, sender, duplicate, 'like');
    check(sentMessages.length === 3, 'Повтор совпадения не создаёт уведомлений');
    await saveProfile(ids[2], { active: true });
    const third = await getProfile(ids[2]);
    const failed = await recordDecisionWithStatus(sender.userId, third.userId, 'like');
    failNextMessage(new Error('Тестовая ошибка доставки'));
    check(!await notifyDecision(sender, third, failed, 'like'), 'Ошибка доставки не прерывает обработку лайка');
    check((await getIncomingLikes(third.userId)).some(row => row.partner === sender.userId), 'Лайк сохраняется при ошибке доставки');
    const skip = await recordDecisionWithStatus(sender.userId, ids[3], 'skip');
    check(!await notifyDecision(sender, await getProfile(ids[3]), skip, 'skip') && sentMessages.length === 3,
      'Пропуск анкеты не отправляет уведомление');
    return { passed };
  } finally {
    await cleanupFixtures(ids);
  }
}
