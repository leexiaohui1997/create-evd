import { Service } from 'egg';
import fs from 'fs';
import path from 'path';

export default class HealthService extends Service {
  public async status() {
    const app = this.app;
    let db = 'failed';
    let redis = 'failed';

    try {
      // egg-sequelize exposes sequelize instance at app.model
      await (app as any).model.authenticate();
      db = 'ok';
    } catch (e) {
      db = 'failed';
    }

    try {
      await (app as any).redis.ping();
      redis = 'ok';
    } catch (e) {
      redis = 'failed';
    }

    let version = 'unknown';
    // 固定按照容器内路径读取版本文件，由 compose 挂载提供
    try {
      const vPath = path.resolve(app.baseDir, 'VERSION');
      version = fs.readFileSync(vPath, 'utf8').trim();
    } catch {}

    return { app: 'ok', db, redis, version, timestamp: new Date().toISOString() };
  }
}