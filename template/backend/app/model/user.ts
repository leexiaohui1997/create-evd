import { Application } from 'egg';

export default (app: Application) => {
  const { INTEGER, STRING } = (app as any).Sequelize;
  const User = (app as any).model.define('user', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: STRING(64), allowNull: false },
  }, {
    tableName: 'users',
    timestamps: true,
  });
  return User;
};