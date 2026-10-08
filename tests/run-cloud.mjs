/**
 * @fileoverview Запуск интеграционных проверок на Telegram Serverless без развёртывания тестов.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFunction } from '../node_modules/@tgcloud/cli/src/api/endpoints.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Собирает исходники проекта для официального API запуска CLI.
 * @param {string} directory - Каталог исходников.
 * @param {string} prefix - Префикс имён модулей.
 * @returns {object} Карта модулей и их исходников.
 */
function readModules(directory, prefix = '') {
  const sources = {};
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const name = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(sources, readModules(fullPath, name + '/'));
    else if (entry.name.endsWith('.js')) sources[name.slice(0, -3)] = fs.readFileSync(fullPath, 'utf8');
  }
  return sources;
}

const token = process.env.TGCLOUD_TOKEN;
if (!token) throw new Error('Для облачной проверки установите TGCLOUD_TOKEN в окружении.');
const sources = readModules(path.join(root, 'tgcloud'));
sources['handlers/message'] = fs.readFileSync(path.join(root, 'tests/cloud-scenario.js'), 'utf8');
sources['lib/test-fixtures'] = fs.readFileSync(path.join(root, 'tests/cloud-fixtures.js'), 'utf8');
sources['lib/ui'] = fs.readFileSync(path.join(root, 'tests/cloud-ui.js'), 'utf8');
try {
  const result = await runFunction(token, 'handlers/message', sources, {}, {});
  for (const line of result.log || []) console.log(line.m);
  console.log(JSON.stringify({ ...result.result, seconds: result.time }));
  sources['handlers/message'] = fs.readFileSync(path.join(root, 'tests/cloud-dialog.js'), 'utf8');
  sources['lib/cleanup-api'] = fs.readFileSync(path.join(root, 'tests/cleanup-api.js'), 'utf8');
  sources['lib/dialog'] = sources['lib/dialog'].replace("import { api, db } from 'sdk';",
    "import { db } from 'sdk'; import { api } from './cleanup-api.js';");
  const dialogResult = await runFunction(token, 'handlers/message', sources, {}, {});
  for (const line of dialogResult.log || []) console.log(line.m);
  console.log(JSON.stringify({ ...dialogResult.result, seconds: dialogResult.time }));
} catch (error) {
  console.error(error.description || error.message);
  if (error.parameters) console.error(JSON.stringify(error.parameters));
  process.exitCode = 1;
}
