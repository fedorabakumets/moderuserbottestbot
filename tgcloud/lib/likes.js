/**
 * @fileoverview Просмотр входящих лайков до возникновения взаимной симпатии.
 */
import { db } from 'sdk';
import { sql } from 'sdk/db';
import { getProfile, saveProfile } from './profiles.js';
import { say, showCard, button } from './ui.js';

/**
 * Возвращает входящие лайки, на которые пользователь ещё не ответил.
 * @param {number} userId - Получатель лайков.
 * @returns {Promise<Array>} Доступные идентификаторы отправителей.
 */
export async function getIncomingLikes(userId) {
  return db.all(sql`SELECT d.actor AS partner FROM dating_decisions d
    JOIN dating_profiles p ON p.user_id = d.actor
    WHERE d.target = ${userId} AND d.action = 'like' AND p.active = 1 AND p.step = 'menu'
    AND NOT EXISTS (SELECT 1 FROM dating_decisions r WHERE r.actor = ${userId} AND r.target = d.actor)
    AND NOT EXISTS (SELECT 1 FROM dating_bans b WHERE b.user_id = d.actor OR b.user_id = ${userId})
    ORDER BY d.rowid DESC`);
}

/**
 * Показывает анкету отправителя входящего лайка с кнопками ответа.
 * @param {number} userId - Получатель лайка.
 * @returns {Promise<object>} Карточка анкеты или пояснение.
 */
export async function showIncomingLike(userId) {
  const viewer = await getProfile(userId);
  if (!viewer || viewer.step !== 'menu') return say(userId, 'Сначала заверши анкету через /menu.');
  if (!viewer.active) return say(userId, 'Верни анкету в поиск, чтобы отвечать на симпатии.',
    [[button('👀 Вернуть в поиск', 'visibility')], [button('💕 Симпатии', 'matches')]]);
  await saveProfile(userId, { candidate: 0, cardId: 0 });
  const rows = await getIncomingLikes(userId);
  const partner = rows.length ? await getProfile(rows[0].partner) : undefined;
  if (!partner) return say(userId, 'Пока нет новых входящих симпатий.', [[button('💕 Симпатии', 'matches')]]);
  const id = partner.userId;
  await say(userId, '💌 Ты понравился этому человеку. Лайкни в ответ, чтобы познакомиться.');
  const card = await showCard(userId, partner, [
    [button('❤️ Нравится в ответ', `like:${id}`), button('➡️ Пропустить', `skip:${id}`)],
    [button('🚫 Заблокировать', `block:${id}`), button('⚠️ Пожаловаться', `report:${id}`)],
    [button('💕 Симпатии', 'matches')],
  ]);
  await saveProfile(userId, { candidate: id, cardId: card.message_id });
  return card;
}
