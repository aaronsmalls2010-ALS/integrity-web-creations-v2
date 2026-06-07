export function buildIssuerSnapshot(s: Record<string, any>) {
  return {
    business_name: s.business_name, address_line1: s.address_line1, address_line2: s.address_line2,
    city: s.city, state: s.state, postal_code: s.postal_code, country: s.country,
    logo_storage_path: s.logo_storage_path, payment_instructions: s.payment_instructions,
    reply_to: s.reply_to, from_email: s.from_email,
  };
}
export function buildBillToSnapshot(c: Record<string, any>) {
  return {
    name: c.name, business_name: c.business_name, email: c.email, phone: c.phone,
    address_line1: c.address_line1, address_line2: c.address_line2,
    city: c.city, state: c.state, postal_code: c.postal_code, country: c.country,
  };
}
