/**
 * @fileoverview Действия с собственной анкетой и подтверждение её удаления.
 */
import { saveProfile, deleteProfile, getProfile } from './profiles.js';
import { beginWizard, promptStep } from './wizard.js';
import { showCard, showMenu, say, button } from './ui.js';
import { isComplete } from './validation.js';

/**
 * Открывает меню либо продолжает незавершённое заполнение.
 * @param {object} profile - Состояние пользователя.
 * @returns {Promise<object>} Меню или вопрос анкеты.
 */
export async function openMenu(profile) {
  if (profile.step === 'delete_confirm') return askDelete(profile);
  if (profile.step !== 'menu') return promptStep(profile);
  return isComplete(profile) ? showMenu(profile) : beginWizard(profile);
}

/**
 * Показывает собственную опубликованную анкету.
 * @param {object} profile - Анкета пользователя.
 * @returns {Promise<object>} Карточка или вопрос анкеты.
 */
export async function showOwnProfile(profile) {
  if (!isComplete(profile)) return promptStep(profile);
  return showCard(profile.userId, profile, [[button('✏️ Изменить', 'edit'), button('🏠 Меню', 'menu')]]);
}

/**
 * Меняет участие готовой анкеты в поиске.
 * @param {object} profile - Анкета пользователя.
 * @returns {Promise<object>} Обновлённое меню.
 */
export async function toggleVisibility(profile) {
  if (!isComplete(profile) || profile.step !== 'menu') return say(profile.userId, 'Сначала заверши анкету через /menu.');
  await saveProfile(profile.userId, { active: !profile.active, candidate: 0, cardId: 0 });
  return showMenu(await getProfile(profile.userId));
}

/**
 * Запрашивает подтверждение удаления данных.
 * @param {object} profile - Анкета пользователя.
 * @returns {Promise<object>} Сообщение с подтверждением.
 */
export async function askDelete(profile) {
  await saveProfile(profile.userId, { step: 'delete_confirm', candidate: 0, cardId: 0 });
  return say(profile.userId, 'Удалить анкету, черновик и связанные симпатии? Это действие нельзя отменить.', [
    [button('Да, удалить', 'delete:yes'), button('Отмена', 'delete:no')],
  ]);
}

/**
 * Удаляет анкету после подтверждения или отменяет действие.
 * @param {object} profile - Анкета пользователя.
 * @param {boolean} confirmed - Подтверждено удаление.
 * @returns {Promise<object>} Результат удаления или меню.
 */
export async function finishDelete(profile, confirmed) {
  if (profile.step !== 'delete_confirm') return say(profile.userId, 'Подтверждение уже неактуально.');
  if (confirmed) {
    await deleteProfile(profile.userId);
    return say(profile.userId, 'Анкета и связанные данные удалены. Для новой анкеты отправь /start.');
  }
  await saveProfile(profile.userId, { step: isComplete(profile) ? 'menu' : 'age' });
  return openMenu(await getProfile(profile.userId));
}

/**
 * Отменяет правки, сохраняя ранее опубликованную анкету.
 * @param {object} profile - Состояние пользователя.
 * @returns {Promise<object>} Главное меню или текущий вопрос.
 */
export async function cancelWizard(profile) {
  if (!isComplete(profile)) return promptStep(profile);
  await saveProfile(profile.userId, { step: 'menu', draft: {}, candidate: 0, cardId: 0 });
  return showMenu(await getProfile(profile.userId));
}
