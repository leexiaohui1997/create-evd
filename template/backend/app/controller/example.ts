import { Controller } from 'egg';

export default class ExampleController extends Controller {
  public async index() {
    const { ctx } = this;
    ctx.body = { message: 'Hello from EggJS example endpoint', time: new Date().toISOString() };
  }
}