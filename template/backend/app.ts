import { Application } from 'egg';

export default (app: Application) => {
  app.beforeStart(async () => {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      // Sync models in development for quick iteration
      try {
        await (app as any).model.sync({ alter: true });
      } catch (e) {
        app.logger.warn('Sequelize sync failed: %s', (e as Error).message);
      }
    }
  });
};