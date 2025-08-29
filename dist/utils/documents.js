"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsToUpload = void 0;
const documents = [
    "Appointment Letter",
    "Birth Certificate/Court Affidavit",
    "First School Leaving Certificate",
    "Last promotion letter",
    "Professional Certificate",
    "Conversion",
    "Passport Photograph",
    "Signature",
];
exports.documentsToUpload = documents.map((doc) => {
    return {
        fileType: doc,
    };
});
