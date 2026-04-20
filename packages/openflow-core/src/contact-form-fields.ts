export const CONTACT_FORM_SUBFIELDS = [
  { key: "firstName", label: "Vorname", configFlag: "showFirstName" },
  { key: "lastName", label: "Nachname", configFlag: "showLastName" },
  { key: "email", label: "E-Mail Adresse", configFlag: "showEmail" },
  { key: "phone", label: "Telefonnummer", configFlag: "showPhone" },
  { key: "company", label: "Unternehmen", configFlag: "showCompany" },
  { key: "vatId", label: "Umsatzsteuer-ID", configFlag: "showVatId" },
  { key: "billingAddress", label: "Rechnungsadresse", configFlag: "showBillingAddress" },
] as const;

export type ContactFormSubFieldKey = typeof CONTACT_FORM_SUBFIELDS[number]["key"];
