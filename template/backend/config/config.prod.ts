import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;
  config.keys = appInfo.name + '_secret_key';
  config.logger = { level: 'INFO' } as any;
  // Disable sequelize logging in prod
  (config as any).sequelize = {
    logging: false,
  };
  return config as any;
};