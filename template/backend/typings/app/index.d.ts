// Minimal type augmentation to include sequelize & redis
import 'egg';
declare module 'egg' {
  interface Application {
    Sequelize: any;
    model: any;
    redis: any;
  }
}