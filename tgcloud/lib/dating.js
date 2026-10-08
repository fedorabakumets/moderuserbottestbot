/**
 * @fileoverview Подбор анкет, обработка решений и создание взаимных симпатий.
 */
import { db } from 'sdk';
import { sql, eq, and } from 'sdk/db';
import { profiles, decisions, matches, reports } from '../schema.js';
import { getProfile } from './profiles.js';

/**
 * Подбирает следующую анкету с учётом города, предпочтений и блокировок.
 * @param {object} viewer - Анкета пользователя, выполняющего поиск.
 * @returns {Promise<object|undefined>} Следующий кандидат.
 */
export async function findCandidate(viewer) {
  const row = await db.get(sql`SELECT p.user_id AS id FROM dating_profiles p
    WHERE p.user_id <> ${viewer.userId} AND p.active = 1 AND p.step = 'menu'
    AND p.city_key = ${viewer.cityKey}
    AND (${viewer.seeking} = 'any' OR p.gender = ${viewer.seeking})
    AND (p.seeking = 'any' OR p.seeking = ${viewer.gender})
    AND NOT EXISTS (SELECT 1 FROM dating_bans b WHERE b.user_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM dating_decisions d WHERE
      (d.actor = ${viewer.userId} AND d.target = p.user_id)
      OR (d.actor = p.user_id AND d.target = ${viewer.userId} AND d.action IN ('block', 'report')))
    ORDER BY p.user_id LIMIT 1`);
  return row ? getProfile(row.id) : undefined;
}

/**
 * Проверяет отсутствие блокировки или жалобы в обе стороны.
 * @param {number} actor - Первый пользователь.
 * @param {number} target - Второй пользователь.
 * @returns {Promise<boolean>} Возможность взаимодействия.
 */
export async function canInteract(actor, target) {
  const banned = await db.get(sql`SELECT user_id FROM dating_bans WHERE user_id = ${actor} OR user_id = ${target} LIMIT 1`);
  if (banned) return false;
  const row = await db.get(sql`SELECT pair FROM dating_decisions
    WHERE ((actor = ${actor} AND target = ${target}) OR (actor = ${target} AND target = ${actor}))
    AND action IN ('block', 'report') LIMIT 1`);
  return !row;
}

/**
 * Однократно принимает решение по актуальной показанной карточке.
 * @param {number} actor - Пользователь, нажавший кнопку.
 * @param {number} target - Идентификатор кандидата.
 * @param {number} messageId - Сообщение с карточкой.
 * @returns {Promise<boolean>} Карточка успешно обработана.
 */
export async function claimCard(actor, target, messageId) {
  const rows = await db.update(profiles).set({ candidate: 0, cardId: 0 })
    .where(and(eq(profiles.userId, actor), eq(profiles.candidate, target),
      eq(profiles.cardId, messageId), eq(profiles.step, 'menu'), eq(profiles.active, true)))
    .returning().run();
  return rows.length === 1;
}

/**
 * Записывает решение и создаёт уникальную взаимную симпатию.
 * @param {number} actor - Автор решения.
 * @param {number} target - Адресат решения.
 * @param {string} action - Решение пользователя.
 * @returns {Promise<boolean>} Создана новая взаимная симпатия.
 */
export async function recordDecision(actor, target, action) {
  const insert = db.insert(decisions).values({ pair: `${actor}:${target}`, actor, target, action });
  if (action === 'block' || action === 'report') {
    await insert.onConflictDoUpdate({ target: decisions.pair, set: { action } }).run();
  } else await insert.onConflictDoNothing({ target: decisions.pair }).run();
  if (action === 'report') await db.insert(reports)
    .values({ pair: `${actor}:${target}`, actor, target, created: Date.now() })
    .onConflictDoNothing({ target: reports.pair }).run();
  if (action !== 'like') return false;
  const first = Math.min(actor, target), second = Math.max(actor, target);
  const result = await db.run(sql`INSERT INTO dating_matches (pair, first_id, second_id)
    SELECT ${`${first}:${second}`}, ${first}, ${second}
    WHERE EXISTS (SELECT 1 FROM dating_decisions WHERE actor = ${actor} AND target = ${target} AND action = 'like')
    AND EXISTS (SELECT 1 FROM dating_decisions WHERE actor = ${target} AND target = ${actor} AND action = 'like')
    AND NOT EXISTS (SELECT 1 FROM dating_decisions WHERE
      ((actor = ${actor} AND target = ${target}) OR (actor = ${target} AND target = ${actor}))
      AND action IN ('block', 'report'))
    ON CONFLICT(pair) DO NOTHING RETURNING pair`);
  return result.rows.length === 1;
}
