/**
 * @fileoverview Уведомления о новых входящих лайках без повторов и лишних сообщений при совпадении.
 */
import { getIncomingLikes } from './likes.js';
import { notifyMatch } from './matches.js';
import { say, button } from './ui.js';

/**
 * Уведомляет о взаимной симпатии или новом одностороннем лайке.
 * @param {object} sender - Автор лайка.
 * @param {object} receiver - Получатель лайка.
 * @param {object} decision - Результат сохранения решения.
 * @param {string} action - Действие пользователя.
 * @returns {Promise<boolean>} Уведомление успешно отправлено.
 */
export async function notifyDecision(sender, receiver, decision, action) {
  if (action !== 'like') return false;
  if (decision.matched) {
    await notifyMatch(sender, receiver);
    return true;
  }
  if (!decision.inserted) return false;
  const incoming = await getIncomingLikes(receiver.userId);
  if (!incoming.some(row => row.partner === sender.userId)) return false;
  try {
    await say(receiver.userId, '💌 Ты кому-то понравился! Посмотри анкету и реши, хочешь ли познакомиться.',
      [[button('💌 Посмотреть анкету', 'incoming')]]);
    return true;
  } catch (error) {
    console.warn('Не удалось доставить уведомление о лайке', receiver.userId, error.code || error.message);
    return false;
  }
}
