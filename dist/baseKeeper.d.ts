import * as EventEmitter from 'events';
import { Logger } from 'el-logger';
export declare class BaseKeeper extends EventEmitter {
    protected logger: Logger;
    name: string;
    constructor();
}
