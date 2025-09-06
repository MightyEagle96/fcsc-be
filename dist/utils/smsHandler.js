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
exports.SendSms = exports.digitalpulseapi = void 0;
const axios_1 = __importDefault(require("axios"));
const request_1 = __importDefault(require("request"));
exports.digitalpulseapi = "https://mps.digitalpulseapi.net/1.0/send-sms/anq";
const SmsService = axios_1.default.create({
    baseURL: "https://mps.digitalpulseapi.net/1.0/send-sms/anq",
    headers: {
        "Content-Type": "application/json",
        "api-key": "JI72Yke0ClS737hPr9PEA==",
    },
});
const SendSms = (message, receiver) => __awaiter(void 0, void 0, void 0, function* () {
    const data = {
        sender: "55019",
        message,
        receiver,
    };
    const options = {
        method: "POST",
        url: exports.digitalpulseapi,
        headers: {
            "Content-Type": "application/json",
            "api-key": "JI72Yke0ClS737hPr9PEA==",
        },
        body: JSON.stringify(data),
    };
    //send message
    (0, request_1.default)(options, function (error, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (error) {
                console.log(new Error(error).message);
                return "not delivered";
            }
            else {
                console.log("Message sent");
                return "delivered";
            }
        });
    });
});
exports.SendSms = SendSms;
SmsService.interceptors.response.use((response) => {
    return response;
}, (error) => {
    if (error.response) {
        return { data: error.response.data, status: error.response.status };
    }
    return { data: "Cannot connect at this time", status: 500 };
});
exports.default = SmsService;
