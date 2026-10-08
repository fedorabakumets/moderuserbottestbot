/**
 * @fileoverview Чтение, обновление и удаление анкет пользователей.
 */
import { db } from 'sdk';
import { eq, or } from 'sdk/db';
import { profiles, decisions, matches, reports } from '../schema.js';

/**
 * Возвращает анкету по идентификатору.
 * @param {number} userId - Идентификатор пользователя.
 * @returns {Promise<object|undefined>} Найденная анкета.
 */
export async function getProfile(userId) {
  return db.select().from(profiles).where(eq(profiles.userId, userId)).get();
}

/**
 * Создаёт состояние диалога и обновляет публичное имя Telegram.
 * @param {object} user - Пользователь Telegram.
 * @returns {Promise<object>} Состояние пользователя.
 */
export async function ensureProfile(user) {
  await db.insert(profiles).values({ userId: user.id, username: user.username || '' })
    .onConflictDoUpdate({ target: profiles.userId, set: { username: user.username || '' } }).run();
  return getProfile(user.id);
}

/**
 * Обновляет отдельные поля состояния пользователя.
 * @param {number} userId - Идентификатор пользователя.
 * @param {object} fields - Изменяемые поля.
 * @returns {Promise<object>} Результат записи.
 */
export async function saveProfile(userId, fields) {
  return db.update(profiles).set(fields).where(eq(profiles.userId, userId)).run();
}

/**
 * Удаляет анкету и связанные решения, симпатии и жалобы.
 * @param {number} userId - Идентификатор пользователя.
 * @returns {Promise<void>} Завершение удаления.
 */
export async function deleteProfile(userId) {
  await saveProfile(userId, { active: false, candidate: 0 });
  await db.delete(decisions).where(or(eq(decisions.actor, userId), eq(decisions.target, userId))).run();
  await db.delete(matches).where(or(eq(matches.first, userId), eq(matches.second, userId))).run();
  await db.delete(reports).where(or(eq(reports.actor, userId), eq(reports.target, userId))).run();
  await db.delete(profiles).where(eq(profiles.userId, userId)).run();
}
