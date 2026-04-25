import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const failures = [];
const infos = [];

const toWinPath = (p) => p.replace(/\//g, path.sep);
const readText = (relativePath) => fs.readFileSync(path.join(rootDir, toWinPath(relativePath)), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(rootDir, toWinPath(relativePath)));

const assert = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

const requireFile = (relativePath) => {
  const ok = exists(relativePath);
  assert(ok, `缺少文件: ${relativePath}`);
  return ok;
};

const parseJson = (relativePath) => {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    failures.push(`${relativePath} JSON 解析失败: ${error.message}`);
    return null;
  }
};

const checkVersionQueryAligned = (indexHtml, configHtml, fileBaseName) => {
  const pattern = new RegExp(`${fileBaseName}\\?v=([a-zA-Z0-9.-]+)`);
  const m1 = indexHtml.match(pattern);
  const m2 = configHtml.match(pattern);
  assert(Boolean(m1), `index.html 未找到 ${fileBaseName}?v=...`);
  assert(Boolean(m2), `config.html 未找到 ${fileBaseName}?v=...`);
  if (m1 && m2) {
    assert(m1[1] === m2[1], `${fileBaseName} 版本号不一致: index=${m1[1]} config=${m2[1]}`);
    infos.push(`${fileBaseName} 版本: ${m1[1]}`);
  }
};

const checkVersionsData = (data) => {
  assert(data && typeof data === 'object' && !Array.isArray(data), 'versions.json 顶层必须是对象');
  const versions = data && Array.isArray(data.versions) ? data.versions : [];
  assert(versions.length > 0, 'versions.json 缺少 versions 列表');
  const anchors = new Set();

  versions.forEach((item, index) => {
    const prefix = `versions[${index}]`;
    assert(item && typeof item === 'object' && !Array.isArray(item), `${prefix} 必须是对象`);
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return;
    }
    assert(typeof item.tag === 'string' && item.tag.trim(), `${prefix}.tag 不能为空`);
    assert(typeof item.date === 'string' && item.date.trim(), `${prefix}.date 不能为空`);
    assert(typeof item.log_anchor === 'string' && /^log-[a-z0-9-]+$/i.test(item.log_anchor), `${prefix}.log_anchor 格式非法`);
    assert(typeof item.title === 'string' && item.title.trim(), `${prefix}.title 不能为空`);
    assert(typeof item.panel_summary === 'string' && item.panel_summary.trim(), `${prefix}.panel_summary 不能为空`);
    assert(Array.isArray(item.highlights) && item.highlights.length > 0, `${prefix}.highlights 至少要有一项`);
    assert(!anchors.has(item.log_anchor), `${prefix}.log_anchor 重复: ${item.log_anchor}`);
    anchors.add(item.log_anchor);
  });

  infos.push(`版本条目数: ${versions.length}`);
};

const checkContentData = (data) => {
  assert(data && typeof data === 'object' && !Array.isArray(data), 'content.json 顶层必须是对象');
  const requiredModes = ['default', 'release'];
  requiredModes.forEach((mode) => {
    const item = data && data[mode];
    assert(item && typeof item === 'object' && !Array.isArray(item), `content.${mode} 必须是对象`);
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return;
    }
    assert(item.selectors && typeof item.selectors === 'object' && !Array.isArray(item.selectors), `content.${mode}.selectors 必须是对象`);
    assert(Array.isArray(item.features) && item.features.length >= 3, `content.${mode}.features 至少 3 项`);
    assert(Array.isArray(item.steps) && item.steps.length >= 3, `content.${mode}.steps 至少 3 项`);
    assert(item.download_notes && typeof item.download_notes === 'object' && !Array.isArray(item.download_notes), `content.${mode}.download_notes 必须是对象`);
  });
};

const run = () => {
  const required = [
    'index.html',
    'config.html',
    '404.html',
    'css/style.css',
    'js/main.js',
    'data/versions.json',
    'data/content.json'
  ];
  required.forEach((f) => requireFile(f));
  if (failures.length) {
    return;
  }

  const indexHtml = readText('index.html');
  const configHtml = readText('config.html');
  const mainJs = readText('js/main.js');

  assert(indexHtml.includes('<ol class="timeline">'), 'index.html 缺少时间线容器 .timeline');
  assert(indexHtml.includes('id="versionPanel"'), 'index.html 缺少版本面板容器');
  assert(configHtml.includes('id="versionPanel"'), 'config.html 缺少版本面板容器');

  assert(mainJs.includes('data/versions.json'), 'main.js 未引用 data/versions.json');
  assert(mainJs.includes('data/content.json'), 'main.js 未引用 data/content.json');
  assert(mainJs.includes('setupChangelogData'), 'main.js 未启用时间线动态渲染');

  checkVersionQueryAligned(indexHtml, configHtml, 'js/main.js');
  checkVersionQueryAligned(indexHtml, configHtml, 'css/style.css');

  const versionsData = parseJson('data/versions.json');
  if (versionsData) {
    checkVersionsData(versionsData);
  }
  const contentData = parseJson('data/content.json');
  if (contentData) {
    checkContentData(contentData);
  }
};

run();

if (failures.length) {
  console.error('❌ 发布检查失败:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('✅ 发布检查通过');
infos.forEach((item) => console.log(`- ${item}`));
