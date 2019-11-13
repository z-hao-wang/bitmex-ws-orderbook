"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require("events");
const el_logger_1 = require("el-logger");
class BaseKeeper extends EventEmitter {
    constructor() {
        super();
        this.name = 'default'; // override this
        this.logger = new el_logger_1.Logger({ name: this.name });
    }
}
exports.BaseKeeper = BaseKeeper;
