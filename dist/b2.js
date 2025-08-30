"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.b2 = exports.initB2 = void 0;
const backblaze_b2_1 = __importDefault(require("backblaze-b2"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const b2 = new backblaze_b2_1.default({
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
    applicationKey: process.env.B2_APPLICATION_KEY,
    //bucketId: process.env.B2_BUCKET_ID as string
});
exports.b2 = b2;
const initB2 = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield b2.authorize();
        console.log("Connected successfully to B2");
    }
    catch (error) {
        //console.log(error);
        console.log("error occured");
    }
});
exports.initB2 = initB2;
