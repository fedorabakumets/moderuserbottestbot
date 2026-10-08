/**
 * @fileoverview Маршрутизация команд знакомства и теста Serverless.
 */
import { openMenu, showOwnProfile, toggleVisibility, askDelete, cancelWizard } from './actions.js';
import { beginWizard } from './wizard.js';
import { browseProfiles } from './browse.js';
import { showMatches } from './matches.js';
import { say } from './ui.js';
import { incrementCounter } from './counter.js';

/**
 * Выполняет команду пользователя.
 * @param {string} command - Название команды.
 * @param {object} profile - Анкета пользователя.
 * @returns {Promise<boolean>} Команда обработана.
 */
export async function routeCommand(command, profile) {
  const actions = {
    '/start': openMenu, '/menu': openMenu, '/profile': showOwnProfile,
    '/edit': beginWizard, '/browse': browseProfiles, '/hide': toggleVisibility,
    '/delete': askDelete, '/cancel': cancelWizard,
  };
  if (actions[command]) { await actions[command](profile); return true; }
  if (command === '/matches') { await showMatches(profile.userId); return true; }
  if (command === '/serverless_test') {
    const count = await incrementCounter(profile.userId);
    await say(profile.userId, `Telegram Serverless работает ✅\nСчётчик в базе: ${count}\nВерсия: Котик 1.0`);
    return true;
  }
  if (command === '/help') {
    await say(profile.userId, '🐱 Котик — знакомства для взрослых.\n\n/start — создать или продолжить анкету\n/browse — анкеты в твоём городе\n/profile — твоя анкета\n/edit — изменить её\n/matches — взаимные симпатии\n/hide — скрыть или вернуть анкету\n/delete — удалить данные\n/cancel — отменить правки\n\nКонтакт открывается после взаимного лайка. Жалоба или блокировка исключает человека из поиска и списка симпатий. Скрытая анкета не участвует в поиске. Во время редактирования анкета временно не показывается другим.');
    return true;
  }
  return false;
}
