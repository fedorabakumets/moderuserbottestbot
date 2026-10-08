/**
 * @fileoverview Проверки возраста, медиа, ограничений полей и готовности анкеты.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseField, normalizeCity, isComplete } from '../tgcloud/lib/validation.js';

/** Проверяет отказ для несовершеннолетнего и некорректного возраста. */
test('Возраст принимается только от 18 до 100', () => {
  for (const value of ['17', '101', '18 лет', '-20', '18.5', '']) assert.ok(parseField('age', { text: value }).error);
  assert.deepEqual(parseField('age', { text: '18' }), { age: 18 });
  assert.deepEqual(parseField('age', { text: '100' }), { age: 100 });
});

/** Проверяет каноническое название города и допустимые варианты выбора. */
test('Город нормализуется, варианты пола проверяются', () => {
  assert.equal(normalizeCity('  ОрЁл  '), 'орел');
  assert.equal(normalizeCity('Нижний   Новгород'), 'нижний новгород');
  assert.equal(parseField('gender', { text: 'Я девушка' }).gender, 'female');
  assert.ok(parseField('gender', { text: 'Девушки' }).error);
  assert.equal(parseField('seeking', { text: 'Все равно' }).seeking, 'any');
});

/** Проверяет ограничения текстов и возможность пропустить описание. */
test('Длина полей ограничена', () => {
  assert.ok(parseField('name', { text: 'А' }).error);
  assert.ok(parseField('name', { text: 'я'.repeat(41) }).error);
  assert.ok(parseField('city', { text: 'я'.repeat(61) }).error);
  assert.ok(parseField('bio', { text: 'я'.repeat(501) }).error);
  assert.equal(parseField('bio', { text: 'Пропустить' }).bio, '');
});

/** Проверяет выбор фотографии и ограничение длительности видео. */
test('Медиа — фото либо видео до 15 секунд', () => {
  assert.deepEqual(parseField('media', { photo: [{ file_id: 'small' }, { file_id: 'large' }] }), { mediaId: 'large', mediaType: 'photo' });
  assert.equal(parseField('media', { video: { file_id: 'video', duration: 15 } }).mediaId, 'video');
  assert.ok(parseField('media', { video: { file_id: 'video', duration: 16 } }).error);
  assert.ok(parseField('media', { document: { file_id: 'file' } }).error);
});

/** Проверяет невозможность публикации неполной анкеты. */
test('Публикуется только готовая анкета', () => {
  const profile = { name: 'Тест', age: 18, gender: 'male', seeking: 'any', city: 'Москва', mediaId: 'photo', mediaType: 'photo' };
  assert.equal(isComplete(profile), true);
  for (const changes of [{ age: 17 }, { mediaId: '' }, { seeking: 'unknown' }, { mediaType: 'document' }]) {
    assert.equal(isComplete({ ...profile, ...changes }), false);
  }
});
