import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // Application keys
  config.keys = appInfo.name + '_secret_key';

  // Security & CORS (same-origin, disable CSRF for API simplicity)
  config.security = { csrf: { enable: false } } as any;

  // Sequelize (MySQL)
  (config as any).sequelize = {
    dialect: 'mysql',
    host: process.env.DB_HOST || process.env.MYSQL_HOST || 'mysql',
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'app_db',
    username: process.env.DB_USER || process.env.MYSQL_USER || 'app_user',
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'localAppPass123!',
    timezone: '+08:00',
    logging: false,
  };

  // Redis
  (config as any).redis = {
    client: {
      host: process.env.REDIS_HOST || 'redis',
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || 'localRedisPass123!',
      db: 0,
    },
  };

  const bizConfig = {};
  return {
    ...config,
    cluster: {
      listen: {
        port: Number(process.env.PORT || 7001),
        hostname: '0.0.0.0',
      },
    },
    ...bizConfig,
  } as any;
};