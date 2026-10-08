/**
 * @fileoverview Показ чужих анкет и обработка кнопок поиска.
 */
import { findCandidate, canInteract, claimCard, recordDecisionWithStatus } from './dating.js';
import { getProfile, saveProfile } from './profiles.js';
import { say, showCard, button } from './ui.js';
import { notifyDecision } from './notifications.js';
import { isComplete } from './validation.js';

/**
 * Показывает следующего подходящего пользователя.
 * @param {object} viewer - Анкета пользователя поиска.
 * @returns {Promise<object>} Сообщение с результатом поиска.
 */
export async function browseProfiles(viewer) {
  if (!isComplete(viewer) || viewer.step !== 'menu') return say(viewer.userId, 'Сначала заверши анкету через /menu.');
  if (!viewer.active) return say(viewer.userId, 'Верни свою анкету в поиск, чтобы смотреть другие.', [[button('👀 Вернуть в поиск', 'visibility')]]);
  await saveProfile(viewer.userId, { candidate: 0, cardId: 0 });
  const candidate = await findCandidate(viewer);
  if (!candidate) return say(viewer.userId,
    'Пока нет новых анкет в твоём городе с взаимно подходящими предпочтениями. Загляни позже или измени анкету.',
    [[button('🏠 Меню', 'menu')]]);
  const id = candidate.userId;
  const card = await showCard(viewer.userId, candidate, [
    [button('❤️ Нравится', `like:${id}`), button('➡️ Пропустить', `skip:${id}`)],
    [button('🚫 Заблокировать', `block:${id}`), button('⚠️ Пожаловаться', `report:${id}`)],
    [button('🏠 Меню', 'menu')],
  ]);
  await saveProfile(viewer.userId, { candidate: id, cardId: card.message_id });
  return card;
}

/**
 * Принимает решение только для действующей карточки кандидата.
 * @param {object} viewer - Пользователь, нажавший кнопку.
 * @param {string} action - Действие поиска.
 * @param {number} target - Идентификатор кандидата.
 * @param {number} messageId - Идентификатор сообщения.
 * @returns {Promise<object>} Следующая анкета или результат проверки.
 */
export async function decide(viewer, action, target, messageId) {
  if (!['like', 'skip', 'block', 'report'].includes(action) || !Number.isSafeInteger(target) || target <= 0) {
    return say(viewer.userId, 'Неизвестное действие.');
  }
  if (!await claimCard(viewer.userId, target, messageId)) return say(viewer.userId, 'Эта карточка уже неактуальна. Открой /browse.');
  const candidate = await getProfile(target);
  if (!candidate?.active || candidate.step !== 'menu' || !await canInteract(viewer.userId, target)) {
    return browseProfiles(await getProfile(viewer.userId));
  }
  const decision = await recordDecisionWithStatus(viewer.userId, target, action);
  await notifyDecision(viewer, candidate, decision, action);
  if (action === 'block' || action === 'report') await say(viewer.userId,
    action === 'report' ? 'Жалоба сохранена для владельца бота. Пользователь заблокирован для тебя.' : 'Пользователь заблокирован для тебя.');
  return browseProfiles(await getProfile(viewer.userId));
}
