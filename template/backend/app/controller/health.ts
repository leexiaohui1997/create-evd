import { Controller } from 'egg';

export default class HealthController extends Controller {
  public async index() {
    const { ctx } = this;
    const status = await ctx.service.health.status();
    ctx.body = status;
  }
}