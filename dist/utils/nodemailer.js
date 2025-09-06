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
exports.sendMailFunc = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
//console.log(process.env.MAILTRAP_TOKEN);
const transporter = nodemailer_1.default.createTransport({
    host: "bulk.smtp.mailtrap.io", // from Mailtrap
    port: 587, // from Mailtrap
    auth: {
        user: "api", // from Mailtrap
        pass: process.env.MAILTRAP_TOKEN, // from Mailtrap
    },
});
function sendMailFunc(to, subject, html) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const info = yield transporter.sendMail({
                from: "<no-reply@accreditation.jamb.gov.ng>",
                to: to,
                subject,
                html,
            });
            console.log("Message sent: %s", info.messageId);
        }
        catch (err) {
            console.error("Error sending mail:", err);
        }
    });
}
exports.sendMailFunc = sendMailFunc;
