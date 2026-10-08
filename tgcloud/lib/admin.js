/**
 * @fileoverview Просмотр жалоб и управление доступом владельцем бота.
 */
import { api, db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { bans } from '../schema.js';
import { saveProfile } from './profiles.js';
import { say } from './ui.js';

/** Идентификатор владельца тестового бота. */
export const OWNER_ID = 1612141295;

/**
 * Проверяет запрет доступа к боту.
 * @param {number} userId - Идентификатор пользователя.
 * @returns {Promise<boolean>} Пользователь заблокирован владельцем.
 */
export async function isBanned(userId) {
  return Boolean(await db.select().from(bans).where(eq(bans.userId, userId)).get());
}

/**
 * Выполняет команды модерации только для владельца.
 * @param {object} message - Сообщение с командой.
 * @param {string} command - Название команды.
 * @returns {Promise<boolean>} Команда распознана.
 */
export async function handleAdmin(message, command) {
  if (!['/reports', '/ban', '/unban', '/setup'].includes(command)) return false;
  if (message.from.id !== OWNER_ID) { await say(message.chat.id, 'Команда доступна владельцу бота.'); return true; }
  if (command === '/setup') {
    await api.setMyName({ name: 'Котик 🐱 • знакомства' });
    await api.setMyDescription({ description: '🐱 Знакомства для взрослых: создай анкету, найди людей из своего города и получи взаимную симпатию. Фото, видео и личные предпочтения. Telegram Serverless.' });
    await api.setMyCommands({ commands: [
      { command: 'start', description: 'Начать или продолжить анкету' },
      { command: 'menu', description: 'Главное меню' },
      { command: 'browse', description: 'Смотреть анкеты' },
      { command: 'profile', description: 'Моя анкета' },
      { command: 'edit', description: 'Изменить анкету' },
      { command: 'matches', description: 'Взаимные симпатии' },
      { command: 'hide', description: 'Скрыть или вернуть анкету' },
      { command: 'delete', description: 'Удалить анкету и связанные данные' },
      { command: 'cancel', description: 'Отменить редактирование' },
      { command: 'help', description: 'Как пользоваться ботом' },
    ] });
    await say(message.chat.id, 'Название, описание и меню команд обновлены.');
  } else if (command === '/reports') {
    const rows = await db.all(sql`SELECT actor, target FROM dating_reports ORDER BY created DESC LIMIT 20`);
    await say(message.chat.id, rows.length
      ? 'Последние жалобы:\n' + rows.map((row) => `${row.actor} → ${row.target}`).join('\n') + '\n\n/ban ID — запретить доступ, /unban ID — снять запрет.'
      : 'Жалоб пока нет.');
  } else {
    const value = message.text.trim().split(/\s+/)[1] || '';
    const userId = /^\d+$/.test(value) ? Number(value) : 0;
    if (!Number.isSafeInteger(userId) || userId <= 0 || userId === OWNER_ID) {
      await say(message.chat.id, `Укажи идентификатор пользователя: ${command} ID`);
    } else if (command === '/ban') {
      await db.insert(bans).values({ userId }).onConflictDoNothing({ target: bans.userId }).run();
      await saveProfile(userId, { active: false, candidate: 0, cardId: 0 });
      await say(message.chat.id, 'Доступ запрещён, анкета скрыта.');
    } else {
      await db.delete(bans).where(eq(bans.userId, userId)).run();
      await say(message.chat.id, 'Запрет снят. Пользователь сможет сам вернуть анкету в поиск.');
    }
  }
  return true;
}
