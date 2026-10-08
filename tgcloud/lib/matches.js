/**
 * @fileoverview Уведомления о взаимных симпатиях и просмотр доступных контактов.
 */
import { db } from 'sdk';
import { sql } from 'sdk/db';
import { getProfile } from './profiles.js';
import { canInteract, recordDecision } from './dating.js';
import { say, button } from './ui.js';
import { getIncomingLikes } from './likes.js';

/**
 * Формирует кнопку контакта только после взаимной симпатии.
 * @param {object} profile - Анкета собеседника.
 * @returns {object} Ссылка на пользователя Telegram.
 */
function contactButton(profile) {
  return { text: `Написать: ${profile.name}`, url: profile.username
    ? `https://t.me/${profile.username}` : `tg://user?id=${profile.userId}` };
}

/**
 * Отправляет уведомления обоим участникам новой взаимной симпатии.
 * @param {object} first - Первый участник.
 * @param {object} second - Второй участник.
 * @returns {Promise<void>} Завершение отправки уведомлений.
 */
export async function notifyMatch(first, second) {
  if (!await canInteract(first.userId, second.userId)) return;
  for (const [receiver, partner] of [[first, second], [second, first]]) {
    try {
      await say(receiver.userId, `💕 Взаимная симпатия с ${partner.name}! Теперь можно познакомиться.`, [[contactButton(partner)]]);
    } catch (error) {
      console.warn('Не удалось доставить уведомление о симпатии', receiver.userId, error.code || error.message);
    }
  }
}

/**
 * Показывает входящие лайки и до двадцати последних взаимных симпатий.
 * @param {number} userId - Идентификатор пользователя.
 * @returns {Promise<object>} Сообщение со списком контактов.
 */
export async function showMatches(userId) {
  const incoming = await getIncomingLikes(userId);
  const rows = await db.all(sql`SELECT CASE WHEN first_id = ${userId} THEN second_id ELSE first_id END AS partner
    FROM dating_matches WHERE first_id = ${userId} OR second_id = ${userId} ORDER BY rowid DESC LIMIT 20`);
  const buttons = [];
  for (const row of rows) {
    const partner = await getProfile(row.partner);
    if (partner && await canInteract(userId, row.partner)) {
      buttons.push([contactButton(partner)]);
      buttons.push([button('🚫 Блок', `matchblock:${row.partner}`), button('⚠️ Жалоба', `matchreport:${row.partner}`)]);
    }
  }
  const text = `💌 Новые входящие симпатии: ${incoming.length}.\n\n`
    + (buttons.length ? '💕 Твои взаимные симпатии:' : 'Пока нет взаимных симпатий.');
  const inbox = incoming.length ? [[button(`💌 Кто меня лайкнул (${incoming.length})`, 'incoming')]] : [];
  return say(userId, text, [...inbox, ...buttons, [button('🏠 Меню', 'menu')]]);
}

/**
 * Блокирует собеседника из списка собственных взаимных симпатий.
 * @param {number} userId - Автор действия.
 * @param {number} target - Собеседник из взаимной симпатии.
 * @param {string} action - Блокировка или жалоба.
 * @returns {Promise<object>} Обновлённый список или ошибка.
 */
export async function moderateMatch(userId, target, action) {
  if (!Number.isSafeInteger(target) || target <= 0 || target === userId) return say(userId, 'Некорректный собеседник.');
  const pair = `${Math.min(userId, target)}:${Math.max(userId, target)}`;
  const match = await db.get(sql`SELECT pair FROM dating_matches WHERE pair = ${pair}`);
  if (!match || !['block', 'report'].includes(action)) return say(userId, 'Эта симпатия недоступна.');
  await recordDecision(userId, target, action);
  await say(userId, action === 'report' ? 'Жалоба сохранена, пользователь заблокирован.' : 'Пользователь заблокирован.');
  return showMatches(userId);
}
