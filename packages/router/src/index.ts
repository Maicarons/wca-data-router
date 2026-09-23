import { resolve } from 'node:path';
import { createApp } from './app';
import { loadConfig } from './config';
import {
  CompositeSource,
  HttpStaticSource,
  LocalDirSource,
  type StaticSource,
} from './datasource/static-source';

const config = loadConfig();

function buildSource(): StaticSource {
  const sources: StaticSource[] = [];
  if (config.staticRoot) {
    sources.push(new LocalDirSource(config.staticRoot));
  }
  if (config.staticBaseUrl) {
    sources.push(new HttpStaticSource(config.staticBaseUrl));
  }
  if (!sources.length) {
    sources.push(new LocalDirSource(resolve(process.cwd(), 'api')));
  }
  return sources.length === 1 ? sources[0]! : new CompositeSource(sources);
}

const source = buildSource();
const app = createApp({ config, source });

app.listen(config.port);
console.log(`WCA Data Router listening on http://localhost:${config.port}`);
console.log(`Static source: ${source.describe()}`);

export { app, config, source };
