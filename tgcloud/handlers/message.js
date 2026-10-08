/**
 * @fileoverview Обработчик команд и ответов анкеты бота знакомств «Котик».
 */
import { ensureProfile } from '../lib/profiles.js';
import { acceptAnswer, promptStep } from '../lib/wizard.js';
import { say, showMenu } from '../lib/ui.js';
import { handleAdmin, isBanned } from '../lib/admin.js';
import { routeCommand } from '../lib/commands.js';

/**
 * Выполняет команды либо сохраняет ответ на вопрос анкеты.
 * @param {object} message - Входящее сообщение Telegram.
 * @returns {Promise<object|undefined>} Результат диалога или отсутствие действия.
 */
export default async function handleMessage(message) {
  if (message.chat?.type !== 'private' || !message.from || message.from.is_bot) return;
  const command = (message.text?.trim().split(/\s+/)[0] || '').split('@')[0];
  if (await handleAdmin(message, command)) return;
  if (await isBanned(message.from.id)) return say(message.chat.id, 'Доступ к боту ограничен владельцем.');
  const profile = await ensureProfile(message.from);
  if (command.startsWith('/')) {
    if (!await routeCommand(command, profile)) return say(message.chat.id, 'Неизвестная команда. Список: /help');
    return;
  }
  if (profile.step === 'menu') return showMenu(profile);
  if (profile.step === 'confirm' || profile.step === 'delete_confirm') return routeCommand('/menu', profile);
  return acceptAnswer(profile, message);
}
