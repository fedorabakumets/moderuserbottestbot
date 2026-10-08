/**
 * @fileoverview Пошаговое заполнение, редактирование и подтверждение анкеты.
 */
import { STEPS, parseField, isComplete } from './validation.js';
import { saveProfile, getProfile } from './profiles.js';
import { say, showCard, showMenu, button } from './ui.js';

const QUESTIONS = {
  age: '🐱 Знакомства для тех, кому исполнилось 18 лет.\nСколько тебе лет?',
  gender: 'Теперь определимся с полом.',
  seeking: 'Кто тебе интересен?',
  city: 'Из какого ты города? Напиши полное название.',
  name: 'Как мне тебя называть?',
  bio: 'Расскажи о себе и кого хочешь найти. До 500 символов.',
  media: 'Пришли фото или видео до 15 секунд. Его будут видеть другие пользователи.',
};
const OPTIONS = { gender: ['Я девушка', 'Я парень'], seeking: ['Девушки', 'Парни', 'Все равно'], bio: ['Пропустить'] };

/**
 * Показывает вопрос текущего шага или предпросмотр.
 * @param {object} profile - Состояние пользователя.
 * @returns {Promise<object>} Сообщение с вопросом.
 */
export async function promptStep(profile) {
  if (profile.step === 'confirm') {
    await showCard(profile.userId, profile.draft);
    return say(profile.userId, 'Всё верно? После публикации анкета появится в поиске.', [
      [button('✅ Опубликовать', 'publish'), button('✏️ Заполнить заново', 'edit')],
    ]);
  }
  const rows = (OPTIONS[profile.step] || []).map((text) => [button(text, `answer:${text}`)]);
  const value = profile.step === 'media' ? profile.draft.mediaId : profile.draft[profile.step];
  if (value) rows.push([button('Оставить текущее', 'keep')]);
  if (isComplete(profile)) rows.push([button('Отменить редактирование', 'cancel')]);
  return say(profile.userId, QUESTIONS[profile.step] || 'Продолжи через /menu.', rows);
}

/**
 * Начинает заполнение с сохранением текущих значений.
 * @param {object} profile - Состояние пользователя.
 * @returns {Promise<object>} Первый вопрос анкеты.
 */
export async function beginWizard(profile) {
  const draft = {};
  for (const field of ['age', 'gender', 'seeking', 'city', 'cityKey', 'name', 'bio', 'mediaId', 'mediaType']) {
    draft[field] = profile[field];
  }
  await saveProfile(profile.userId, { step: 'age', draft, candidate: 0, cardId: 0 });
  return promptStep({ ...profile, step: 'age', draft });
}

/**
 * Проверяет ответ и переходит к следующему шагу.
 * @param {object} profile - Состояние пользователя.
 * @param {object} message - Ответ пользователя.
 * @param {boolean} keep - Сохранить текущее значение.
 * @returns {Promise<object>} Следующий вопрос или ошибка.
 */
export async function acceptAnswer(profile, message, keep = false) {
  const index = STEPS.indexOf(profile.step);
  if (index < 0) return promptStep(profile);
  const field = profile.step === 'media' ? 'mediaId' : profile.step;
  if (keep && !profile.draft[field]) {
    await say(profile.userId, 'Сначала заполни это поле.');
    return promptStep(profile);
  }
  const parsed = keep ? {} : parseField(profile.step, message);
  if (parsed.error) {
    await say(profile.userId, parsed.error);
    return promptStep(profile);
  }
  const draft = { ...profile.draft, ...parsed };
  const step = STEPS[index + 1] || 'confirm';
  await saveProfile(profile.userId, { step, draft });
  return promptStep({ ...profile, step, draft });
}

/**
 * Публикует подтверждённую анкету.
 * @param {object} profile - Состояние пользователя.
 * @returns {Promise<object>} Главное меню или ошибка.
 */
export async function publishProfile(profile) {
  if (profile.step !== 'confirm' || !isComplete(profile.draft)) return say(profile.userId, 'Сначала заверши анкету.');
  await saveProfile(profile.userId, { ...profile.draft, active: true, step: 'menu', draft: {}, candidate: 0, cardId: 0 });
  return showMenu(await getProfile(profile.userId));
}
