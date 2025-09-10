const documents = [
  "Letter of First Appointment",
  "Gazette of Confirmation of Appointment",
  "Letter of Last Promotion",

  "Birth Certificate",
  "Professional Certificate (where applicable)",
  "Conversion/Transfer of Service/Regularization of Appointment (where applicable)",
  "Passport Photograph",
  "Signature",
];

export const documentsToUpload = documents.map((doc) => {
  return {
    fileType: doc,
  };
});
