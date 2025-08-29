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

export const documentsToUpload = documents.map((doc) => {
  return {
    fileType: doc,
  };
});
