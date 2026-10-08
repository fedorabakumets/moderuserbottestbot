/**
 * @fileoverview Проверка поиска, повторных лайков, блокировок и удаления на облачной SQLite.
 */
import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { bans } from '../schema.js';
import { createFixtures, cleanupFixtures } from '../lib/test-fixtures.js';
import { getProfile, saveProfile, deleteProfile } from '../lib/profiles.js';
import { findCandidate, claimCard, recordDecision, canInteract } from '../lib/dating.js';
import { beginWizard, acceptAnswer, publishProfile } from '../lib/wizard.js';
import { toggleVisibility, askDelete, finishDelete, cancelWizard } from '../lib/actions.js';
import { STEPS } from '../lib/validation.js';
import { getIncomingLikes, showIncomingLike } from '../lib/likes.js';
import { showMatches } from '../lib/matches.js';

let passed = 0;

/**
 * Проверяет условие и прекращает сценарий при ошибке.
 * @param {boolean} condition - Проверяемое условие.
 * @param {string} message - Название проверки.
 * @returns {void} Отсутствие результата.
 */
function check(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
  console.log('Проверка пройдена:', message);
}

/**
 * Проверяет реальные облачные запросы без сообщений пользователям.
 * @returns {Promise<object>} Итог интеграционных проверок.
 */
export default async function verifyCloud() {
  const base = -Date.now();
  const ids = Array.from({ length: 5 }, (_, index) => base + index);
  try {
    await createFixtures(base);
    const [actor, target, hidden] = ids;
    const viewer = await getProfile(actor);
    await beginWizard(viewer);
    check((await getProfile(actor)).step === 'age', 'Редактирование начинается с возраста');
    await acceptAnswer(await getProfile(actor), { text: '17' });
    check((await getProfile(actor)).step === 'age', 'Несовершеннолетний возраст не меняет шаг');
    for (const step of STEPS) {
      const state = await getProfile(actor);
      await acceptAnswer(state, { text: 'Тестовое описание' }, step !== 'bio');
    }
    check((await getProfile(actor)).step === 'confirm', 'Все шаги приводят к предпросмотру');
    await publishProfile(await getProfile(actor));
    check((await getProfile(actor)).step === 'menu', 'Публикация завершает заполнение');
    await toggleVisibility(await getProfile(actor));
    check(!(await getProfile(actor)).active, 'Скрытие анкеты');
    await toggleVisibility(await getProfile(actor));
    check((await getProfile(actor)).active, 'Возврат анкеты в поиск');
    await askDelete(await getProfile(actor));
    await finishDelete(await getProfile(actor), false);
    check((await getProfile(actor)).step === 'menu', 'Отмена удаления сохраняет анкету');
    await beginWizard(await getProfile(actor));
    await cancelWizard(await getProfile(actor));
    check((await getProfile(actor)).step === 'menu', 'Отмена редактирования возвращает меню');
    check((await findCandidate(viewer))?.userId === target, 'Город и взаимные предпочтения');
    await saveProfile(actor, { candidate: target, cardId: 7 });
    check(!await claimCard(actor, target, 6), 'Старая карточка отвергается');
    check(await claimCard(actor, target, 7), 'Текущая карточка принимается');
    check(!await claimCard(actor, target, 7), 'Повторное нажатие отвергается');
    check(!await recordDecision(actor, target, 'like'), 'Односторонний лайк без совпадения');
    check((await getIncomingLikes(target))[0]?.partner === actor, 'Односторонний лайк виден получателю');
    check((await getIncomingLikes(actor)).length === 0, 'Исходящий лайк не попадает во входящие');
    const inbox = await showMatches(target);
    check(inbox.rows.some(row => row.some(item => item.callback_data === 'incoming')), 'Раздел симпатий предлагает входящий лайк');
    await saveProfile(actor, { active: false });
    check((await getIncomingLikes(target)).length === 0, 'Скрытая анкета не показывается во входящих');
    await saveProfile(actor, { active: true });
    await db.insert(bans).values({ userId: actor }).run();
    check((await getIncomingLikes(target)).length === 0, 'Запрет владельца скрывает входящий лайк');
    await db.delete(bans).where(eq(bans.userId, actor)).run();
    await showIncomingLike(target);
    const incomingCard = await getProfile(target);
    check(incomingCard.candidate === actor && incomingCard.cardId === 7, 'Входящий лайк создаёт действующую карточку');
    check(await claimCard(target, actor, 7), 'Карточка входящего лайка принимает ответ');
    check(await recordDecision(target, actor, 'like'), 'Создание взаимной симпатии');
    check((await getIncomingLikes(target)).length === 0, 'Взаимный лайк исчезает из новых входящих');
    check(!await recordDecision(target, actor, 'like'), 'Взаимная симпатия не дублируется');
    await recordDecision(target, actor, 'block');
    check(!await canInteract(actor, target), 'Блокировка заменяет лайк после совпадения');
    check(!await findCandidate(viewer), 'Скрытые, оценённые и неподходящие анкеты исключаются');
    await saveProfile(hidden, { active: true });
    await recordDecision(hidden, actor, 'block');
    check(!await findCandidate(viewer), 'Блокировка работает в обе стороны');
    check(!await canInteract(actor, hidden), 'Контакт с заблокировавшим недоступен');
    await recordDecision(actor, hidden, 'report');
    const report = await db.get(sql`SELECT pair FROM dating_reports WHERE actor = ${actor} AND target = ${hidden}`);
    check(Boolean(report), 'Жалоба сохраняется');
    check(await canInteract(actor, ids[4]), 'Контакт разрешён до запрета владельца');
    await db.insert(bans).values({ userId: ids[4] }).run();
    check(!await canInteract(actor, ids[4]), 'Запрет владельца скрывает контакт');
    await db.delete(bans).where(eq(bans.userId, ids[4])).run();
    await saveProfile(actor, { draft: { name: 'Черновик' }, step: 'name' });
    check((await getProfile(actor)).draft.name === 'Черновик', 'Прогресс анкеты сохраняется');
    await deleteProfile(actor);
    check(!await getProfile(actor), 'Анкета удалена');
    const remaining = await db.get(sql`SELECT count(*) AS total FROM dating_matches WHERE first_id = ${actor} OR second_id = ${actor}`);
    check(remaining.total === 0, 'Связанные симпатии удалены');
    return { passed, cleanup: 'Временные анкеты удаляются в finally' };
  } finally {
    for (const userId of ids) await db.delete(bans).where(eq(bans.userId, userId)).run();
    await cleanupFixtures(ids);
  }
}
