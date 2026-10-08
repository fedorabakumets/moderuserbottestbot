/**
 * @fileoverview Изолированные тестовые анкеты для проверки облачной базы без рассылок.
 */
import { ensureProfile, saveProfile, deleteProfile } from '../lib/profiles.js';

/**
 * Создаёт временные анкеты с отрицательными идентификаторами и уникальным городом.
 * @param {number} base - Базовый тестовый идентификатор.
 * @returns {Promise<Array<number>>} Идентификаторы созданных анкет.
 */
export async function createFixtures(base) {
  const ids = Array.from({ length: 5 }, (_, index) => base + index);
  for (const [index, userId] of ids.entries()) {
    await ensureProfile({ id: userId });
    await saveProfile(userId, { name: 'Тестовая анкета', age: 25,
      gender: index === 0 ? 'male' : 'female', seeking: 'any', city: 'Тест',
      cityKey: `тест-${base}`, mediaId: 'тест', mediaType: 'photo', active: true, step: 'menu' });
  }
  await saveProfile(ids[2], { active: false });
  await saveProfile(ids[3], { cityKey: 'другой тестовый город' });
  await saveProfile(ids[4], { seeking: 'female' });
  return ids;
}

/**
 * Удаляет временные данные после успешной проверки или ошибки.
 * @param {Array<number>} ids - Идентификаторы временных анкет.
 * @returns {Promise<void>} Завершение очистки.
 */
export async function cleanupFixtures(ids) {
  for (const userId of ids) await deleteProfile(userId);
}
