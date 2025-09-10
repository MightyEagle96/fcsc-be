"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsToUpload = void 0;
const documents = [
    "Letter of First Appointment",
    "Gazette of Confirmation of Appointment",
    "Letter of Last Promotion",
    "Last promotion letter",
    "Birth Certificate",
    "Professional Certificate (where applicable)",
    "Conversion/Transfer of Service/Regularization of Appointment (where applicable)",
    "Passport Photograph",
    "Signature",
];
exports.documentsToUpload = documents.map((doc) => {
    return {
        fileType: doc,
    };
});
