const publicChannels = {
  githubSponsors: 'https://github.com/sponsors/fekerulegese10-arch',
  openCollective: process.env.OPENARVA_OPENCOLLECTIVE_URL || 'https://opencollective.com/openarva',
  buyMeACoffee: process.env.OPENARVA_BUYMEACOFFEE_URL || 'https://buymeacoffee.com/openarva',
  telegram: 'https://t.me/openrva177',
  whatsapp: 'https://whatsapp.com/channel/0029Vb8TDKr72WTmtjfWju2s',
  usdtTrc20: process.env.OPENARVA_USDT_TRC20 || 'TNfDCVCZ11PTrQRTXzoAPhQPBuQetf1MSQ',
};

export function renderSponsorChannels() {
  console.log(`
OpenArva Sponsorship

Public sponsorship channels:
  GitHub Sponsors: ${publicChannels.githubSponsors}
  Open Collective: ${publicChannels.openCollective}
  Buy Me a Coffee: ${publicChannels.buyMeACoffee}

Public crypto donation wallet:
  USDT (TRC20): ${publicChannels.usdtTrc20}

Community and support:
  Telegram: ${publicChannels.telegram}
  WhatsApp: ${publicChannels.whatsapp}

Security notice:
  OpenArva never asks for private keys, seed phrases, passwords, API tokens, or card numbers.
  Verify the destination before sending any funds.
`);
}
