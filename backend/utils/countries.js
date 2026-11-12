// Country names used by the storefront (frontend/src/utils/countries.js) → ISO 3166 codes for carriers and tax APIs.
export const COUNTRY_CODES = {
  Australia: 'AU',
  Austria: 'AT',
  Belgium: 'BE',
  Brazil: 'BR',
  Canada: 'CA',
  Denmark: 'DK',
  Finland: 'FI',
  France: 'FR',
  Germany: 'DE',
  India: 'IN',
  Ireland: 'IE',
  Italy: 'IT',
  Japan: 'JP',
  Mexico: 'MX',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  Norway: 'NO',
  Portugal: 'PT',
  Singapore: 'SG',
  Spain: 'ES',
  Sweden: 'SE',
  Switzerland: 'CH',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
}

export const countryCode = (name) => {
  if (!name) return null
  if (/^[A-Za-z]{2}$/.test(name)) return name.toUpperCase()
  return COUNTRY_CODES[name] ?? Object.entries(COUNTRY_CODES).find(([country]) => country.toLowerCase() === name.toLowerCase())?.[1] ?? null
}
