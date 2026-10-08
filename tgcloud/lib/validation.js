/**
 * @fileoverview Проверка полей анкеты и преобразование пользовательского ввода.
 */
export const STEPS = ['age', 'gender', 'seeking', 'city', 'name', 'bio', 'media'];

/**
 * Приводит название города к ключу для поиска.
 * @param {string} value - Введённое название города.
 * @returns {string} Ключ города.
 */
export function normalizeCity(value) {
  return value.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

/**
 * Проверяет наличие обязательных полей готовой анкеты.
 * @param {object} profile - Анкета или её черновик.
 * @returns {boolean} Готовность к публикации.
 */
export function isComplete(profile) {
  return Boolean(profile.name && profile.age >= 18 && profile.age <= 100
    && ['female', 'male'].includes(profile.gender)
    && ['female', 'male', 'any'].includes(profile.seeking)
    && profile.city && profile.mediaId && ['photo', 'video'].includes(profile.mediaType));
}

/**
 * Проверяет ввод на текущем шаге диалога.
 * @param {string} step - Текущий шаг.
 * @param {object} message - Входящее сообщение Telegram.
 * @returns {object} Проверенное значение либо сообщение об ошибке.
 */
export function parseField(step, message) {
  const text = message.text?.trim() || '';
  if (step === 'age') {
    const age = /^\d{2,3}$/.test(text) ? Number(text) : 0;
    return age >= 18 && age <= 100 ? { age } : { error: 'Знакомства доступны с 18 лет. Введи возраст от 18 до 100.' };
  }
  if (step === 'gender' || step === 'seeking') {
    const choices = step === 'gender'
      ? { 'Я девушка': 'female', 'Я парень': 'male' }
      : { 'Девушки': 'female', 'Парни': 'male', 'Все равно': 'any' };
    return choices[text] ? { [step]: choices[text] } : { error: 'Выбери вариант кнопкой под сообщением.' };
  }
  if (step === 'city') return text.length >= 2 && text.length <= 60
    ? { city: text, cityKey: normalizeCity(text) } : { error: 'Введи название города от 2 до 60 символов.' };
  if (step === 'name') return text.length >= 2 && text.length <= 40
    ? { name: text } : { error: 'Имя должно содержать от 2 до 40 символов.' };
  if (step === 'bio') return text.length <= 500 && (text || message.text !== undefined)
    ? { bio: text === 'Пропустить' ? '' : text } : { error: 'Описание — до 500 символов, либо нажми «Пропустить».' };
  if (step === 'media') {
    const photo = message.photo?.[message.photo.length - 1];
    if (photo) return { mediaId: photo.file_id, mediaType: 'photo' };
    if (message.video && message.video.duration <= 15) return { mediaId: message.video.file_id, mediaType: 'video' };
    return { error: 'Пришли фотографию или видео длительностью до 15 секунд.' };
  }
  return { error: 'Открой меню командой /menu.' };
}
