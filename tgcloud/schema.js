/**
 * @fileoverview Схема анкет, симпатий, жалоб и тестового счётчика.
 */
import { table, integer, text, json, boolean } from 'sdk/db';

/** Счётчики тестовых команд в личных чатах. */
export const serverlessTestCounters = table('serverless_test_counters', {
  /** Идентификатор чата, которому принадлежит счётчик. */
  chatId: integer('chat_id').primaryKey(),
  /** Число обработанных тестовых команд. */
  seen: integer('seen').notNull().default(0),
});

/** Анкеты и состояние диалога каждого пользователя. */
export const profiles = table('dating_profiles', {
  /** Идентификатор пользователя Telegram. */
  userId: integer('user_id').primaryKey(),
  /** Публичное имя пользователя Telegram. */
  username: text('username').notNull().default(''),
  /** Имя для отображения в анкете. */
  name: text('name').notNull().default(''),
  /** Возраст пользователя. */
  age: integer('age').notNull().default(0),
  /** Пол пользователя: female или male. */
  gender: text('gender').notNull().default(''),
  /** Предпочтение: female, male или any. */
  seeking: text('seeking').notNull().default(''),
  /** Название города для отображения. */
  city: text('city').notNull().default(''),
  /** Нормализованное название города для поиска. */
  cityKey: text('city_key').notNull().default(''),
  /** Описание пользователя. */
  bio: text('bio').notNull().default(''),
  /** Идентификатор фотографии или видео Telegram. */
  mediaId: text('media_id').notNull().default(''),
  /** Тип вложения: photo или video. */
  mediaType: text('media_type').notNull().default(''),
  /** Участие анкеты в поиске. */
  active: boolean('active').notNull().default(false),
  /** Текущий шаг диалога. */
  step: text('step').notNull().default('age'),
  /** Черновик анкеты до подтверждения публикации. */
  draft: json('draft').notNull().default({}),
  /** Идентификатор показанного кандидата. */
  candidate: integer('candidate').notNull().default(0),
  /** Идентификатор сообщения с текущей карточкой кандидата. */
  cardId: integer('card_id').notNull().default(0),
});

/** Решения по анкетам, включая исключение заблокированных пользователей. */
export const decisions = table('dating_decisions', {
  /** Уникальная направленная пара пользователей. */
  pair: text('pair').primaryKey(),
  /** Пользователь, принявший решение. */
  actor: integer('actor').notNull(),
  /** Пользователь, чью анкету оценили. */
  target: integer('target').notNull(),
  /** Решение: like, skip, block или report. */
  action: text('action').notNull(),
});

/** Взаимные симпатии с уникальной парой пользователей. */
export const matches = table('dating_matches', {
  /** Уникальная ненаправленная пара пользователей. */
  pair: text('pair').primaryKey(),
  /** Меньший идентификатор пользователя в паре. */
  first: integer('first_id').notNull(),
  /** Больший идентификатор пользователя в паре. */
  second: integer('second_id').notNull(),
});

/** Жалобы для просмотра владельцем бота. */
export const reports = table('dating_reports', {
  /** Уникальная пара заявителя и адресата жалобы. */
  pair: text('pair').primaryKey(),
  /** Идентификатор заявителя. */
  actor: integer('actor').notNull(),
  /** Идентификатор пользователя, на которого пожаловались. */
  target: integer('target').notNull(),
  /** Время подачи жалобы в миллисекундах. */
  created: integer('created').notNull(),
});

/** Запреты доступа, установленные владельцем бота. */
export const bans = table('dating_bans', {
  /** Идентификатор заблокированного пользователя. */
  userId: integer('user_id').primaryKey(),
});
