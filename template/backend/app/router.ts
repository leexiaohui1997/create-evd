import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;
  router.get('/api/health', controller.health.index);
  router.get('/api/example', controller.example.index);
};