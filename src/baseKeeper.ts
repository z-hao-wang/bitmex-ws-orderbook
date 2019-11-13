import * as EventEmitter from 'events';
import { Logger } from 'el-logger';

export class BaseKeeper extends EventEmitter {
  protected logger: Logger;
  name = 'default'; // override this

  constructor() {
    super();
    this.logger = new Logger({ name: this.name });
  }
}
