"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsToUpload = exports.documents = void 0;
exports.documents = [
    "Letter of First Appointment",
    "Gazette of Confirmation of Appointment",
    "Letter of Last Promotion",
    "Birth Certificate",
    "Professional Certificate (where applicable)",
    "Conversion/Transfer of Service/Regularization of Appointment (where applicable)",
    "Passport Photograph",
    "Signature",
];
exports.documentsToUpload = exports.documents.map((doc) => {
    return {
        fileType: doc,
    };
});
