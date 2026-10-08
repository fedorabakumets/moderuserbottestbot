/**
 * @fileoverview Обработчик кнопок анкеты, поиска и взаимных симпатий.
 */
import { api } from 'sdk';
import { getProfile } from '../lib/profiles.js';
import { acceptAnswer, beginWizard, publishProfile } from '../lib/wizard.js';
import { openMenu, showOwnProfile, toggleVisibility, askDelete, finishDelete, cancelWizard } from '../lib/actions.js';
import { browseProfiles, decide } from '../lib/browse.js';
import { showMatches, moderateMatch } from '../lib/matches.js';
import { showIncomingLike } from '../lib/likes.js';
import { say } from '../lib/ui.js';
import { isBanned } from '../lib/admin.js';
import { withCleanDialog } from '../lib/dialog.js';

/**
 * Обрабатывает действие текущего пользователя в личном чате.
 * @param {object} query - Callback-запрос Telegram.
 * @returns {Promise<object|undefined>} Сообщение результата действия.
 */
export default async function handleCallback(query) {
  if (query.message?.chat?.type !== 'private' || query.message.chat.id !== query.from?.id) return;
  await api.answerCallbackQuery({ callback_query_id: query.id });
  return withCleanDialog(query.from.id, query.message.message_id, () => processCallback(query));
}

/**
 * Выполняет действие кнопки до очистки предыдущего шага.
 * @param {object} query - Callback-запрос Telegram.
 * @returns {Promise<object|undefined>} Следующий шаг диалога.
 */
async function processCallback(query) {
  if (await isBanned(query.from.id)) return say(query.from.id, 'Доступ к боту ограничен владельцем.');
  const profile = await getProfile(query.from.id);
  if (!profile) return say(query.from.id, 'Анкета удалена. Для новой отправь /start.');
  const [action, value] = (query.data || '').split(':');
  if (action === 'answer') return acceptAnswer(profile, { text: value });
  if (action === 'keep') return acceptAnswer(profile, {}, true);
  if (['like', 'skip', 'block', 'report'].includes(action)) return decide(profile, action, Number(value), query.message.message_id);
  if (action === 'delete' && value) return finishDelete(profile, value === 'yes');
  if (action === 'matches') return showMatches(profile.userId);
  if (action === 'incoming') return showIncomingLike(profile.userId);
  if (action === 'matchblock' || action === 'matchreport') return moderateMatch(profile.userId, Number(value), action === 'matchblock' ? 'block' : 'report');
  const actions = {
    menu: openMenu, mine: showOwnProfile, edit: beginWizard, publish: publishProfile,
    browse: browseProfiles, visibility: toggleVisibility, delete: askDelete, cancel: cancelWizard,
  };
  return actions[action] ? actions[action](profile) : say(profile.userId, 'Кнопка устарела. Открой /menu.');
}
