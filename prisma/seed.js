/* eslint-disable @typescript-eslint/no-require-imports */
const { createHash } = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const additionalRuleData = require("./data/additionalRules.json");

function deterministicId(prefix, parts) {
  const hash = createHash("sha256");
  hash.update(prefix);
  for (const part of parts) {
    hash.update("::" + (part ?? ""));
  }
  return `${prefix}_${hash.digest("hex").slice(0, 24)}`;
}

const DISCLAIMER_DATA = [
  {
    entity: "UK",
    silo: null,
    kind: "uk-risk_full",
    text:
      "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. 62% of retail investor accounts lose money when trading CFDs with this provider. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money. Your capital is at risk.",
  },
  {
    entity: "UK",
    silo: null,
    kind: "uk-risk_short",
    text: "62% of retail CFD accounts lose money.",
  },
  {
    entity: "UK",
    silo: "Spread Bet",
    kind: "uk-risk_spread_bet",
    text:
      "Spread bets are complex instruments and come with a high risk of losing money rapidly due to leverage. 62% of retail investor accounts lose money when trading spread bets with this provider. You should consider whether you understand how spread bets work and whether you can afford to take the high risk of losing your money. Your capital is at risk.",
  },
  {
    entity: "UK",
    silo: "CFD",
    kind: "uk-risk_cfd",
    text:
      "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. 62% of retail investor accounts lose money when trading CFDs with this provider. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money. Your capital is at risk.",
  },
  {
    entity: "EU",
    silo: null,
    kind: "eu-risk_full",
    text:
      "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. 65% of retail investor accounts lose money when trading CFDs with this provider. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money. Your capital is at risk.",
  },
  {
    entity: "EU",
    silo: null,
    kind: "eu-risk_short",
    text: "65% of retail CFD accounts lose money.",
  },
  {
    entity: "EU CY",
    silo: null,
    kind: "eu-cy-risk",
    text:
      "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage. 65% of retail investor accounts lose money when trading CFDs with this provider. You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money. Your capital is at risk.",
  },
  {
    entity: "EU CY",
    silo: null,
    kind: "eu-cy-risk_short",
    text: "65% of retail CFD accounts lose money.",
  },
  {
    entity: "ROW",
    silo: null,
    kind: "row-risk",
    text: "The value of your investment can fluctuate. Losses can exceed deposits.",
  },
  {
    entity: "UK",
    silo: null,
    kind: "uk-disclaimer_transactional",
    emailType: "transactional",
    text:
      "Trading Forex/CFDs on margin carries a high level of risk and may not be suitable for all investors. The products are intended for retail, professional, and eligible counterparty clients. Retail clients who maintain account(s) with Stratos Markets Limited (\"Tradu\") could sustain a total loss of deposited funds but are not subject to subsequent payment obligations beyond the deposited funds but professional clients and eligible counterparty clients could sustain losses in excess of deposits. Tradu is authorised and regulated in the UK by the Financial Conduct Authority. Registration number 217689. Registered in England and Wales with Companies House company number 04072877. Registered address: 125 Old Broad Street, 9th Floor, London EC2N 1AR, United Kingdom. Important Information: Tradu offers spread betting exclusively to UK residents. Spread betting is not intended for distribution to, or use by, any person in any country and jurisdiction where such distribution or use would be contrary to local law or regulation. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default.",
  },
  {
    entity: "UK",
    silo: null,
    kind: "uk-disclaimer",
    text:
      "Trading Forex/CFDs on margin carries a high level of risk and may not be suitable for all investors. The products are intended for retail, professional, and eligible counterparty clients. Retail clients who maintain account(s) with Stratos Markets Limited (\"Tradu\") could sustain a total loss of deposited funds but are not subject to subsequent payment obligations beyond the deposited funds but professional clients and eligible counterparty clients could sustain losses in excess of deposits. Tradu is authorised and regulated in the UK by the Financial Conduct Authority. Registration number 217689. Registered in England and Wales with Companies House company number 04072877. Registered address: 125 Old Broad Street, 9th Floor, London EC2N 1AR, United Kingdom. Important Information: Tradu offers spread betting exclusively to UK residents. Spread betting is not intended for distribution to, or use by, any person in any country and jurisdiction where such distribution or use would be contrary to local law or regulation. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default. You can opt-out of all Tradu marketing communications at any time. If you hold a live account with us, please note that opting-out of marketing communications does not affect the receipt of important business and/or account related communications.",
  },
  {
    entity: "EU",
    silo: "CRYPTO",
    kind: "eu-crypto-disclaimer",
    text: "TBD - CEC-902 - MICA To Do",
    active: false,
  },
  {
    entity: "EU",
    silo: null,
    kind: "eu-disclaimer_transactional",
    emailType: "transactional",
    text:
      "Please read our full Risk Disclosure. Stratos Europe Limited (trading as \"Tradu\") is a Cyprus Investment Firm (\"CIF\") registered with the Cyprus Department of Registrar of Companies (HE 405643) and authorised and regulated by the Cyprus Securities and Exchange Commission (\"CySEC\") under license number 392/20. Registered address: DOMS Assets Business Centre, 33 Neas Engomis Street, 2409 Engomi, Nicosia, Cyprus. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default.",
  },
  {
    entity: "EU",
    silo: null,
    kind: "eu-disclaimer",
    text:
      "Please read our full Risk Disclosure. Stratos Europe Limited (trading as \"Tradu\") is a Cyprus Investment Firm (\"CIF\") registered with the Cyprus Department of Registrar of Companies (HE 405643) and authorised and regulated by the Cyprus Securities and Exchange Commission (\"CySEC\") under license number 392/20. Registered address: DOMS Assets Business Centre, 33 Neas Engomis Street, 2409 Engomi, Nicosia, Cyprus. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default. You can opt-out of all Tradu marketing communications at any time. If you hold a live account with us, please note that opting-out of marketing communications does not affect the receipt of important business and/or account related communications.",
  },
  {
    entity: "EU CY",
    silo: null,
    kind: "eu-cy-disclaimer_transactional",
    emailType: "transactional",
    text:
      "Please read our full Risk Disclosure. Stratos Europe Limited (trading as \"Tradu\") is a Cyprus Investment Firm (\"CIF\") registered with the Cyprus Department of Registrar of Companies (HE 405643) and authorised and regulated by the Cyprus Securities and Exchange Commission (\"CySEC\") under license number 392/20. Registered address: DOMS Assets Business Centre, 33 Neas Engomis Street, 2409 Engomi, Nicosia, Cyprus. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default.",
  },
  {
    entity: "EU CY",
    silo: null,
    kind: "eu-cy-disclaimer",
    text:
      "Please read our full Risk Disclosure. Stratos Europe Limited (trading as \"Tradu\") is a Cyprus Investment Firm (\"CIF\") registered with the Cyprus Department of Registrar of Companies (HE 405643) and authorised and regulated by the Cyprus Securities and Exchange Commission (\"CySEC\") under license number 392/20. Registered address: DOMS Assets Business Centre, 33 Neas Engomis Street, 2409 Engomi, Nicosia, Cyprus. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default. You can opt-out of all Tradu marketing communications at any time. If you hold a live account with us, please note that opting-out of marketing communications does not affect the receipt of important business and/or account related communications.",
  },
  {
    entity: "ROW",
    silo: null,
    kind: "row-disclaimer_transactional",
    emailType: "transactional",
    text:
      "Stratos Global LLC is incorporated in St Vincent and the Grenadines with company registration No. 1776 LLC 2022. Stratos Global LLC is not required to hold any financial services license or authorization in St Vincent and the Grenadine in order to provide products and services related to foreign exchange and CFD’s. Registered address: Euro House, Richmond Hill Road, Kingstown, VC0100, Saint Vincent and the Grenadines. Stratos Systems Limited with company registration No. 8430582-1 is a Securities Dealer licensed by the Financial Services Authority Seychelles (license number: SD147), providing listed shares. Registered address: Block B, Global Village, Jivan’s Complex, Mont Fleuri, Mahe, Seychelles. Stratos Tech Limited is an entity incorporated in Seychelles with company registration No. 8434996-1, providing virtual assets. Registered address: Suite 3, Global Village, Jivan’s Complex, Mont-Fleuri, Mahe, Seychelles. Above mentioned entities are subsidiaries within the same corporate group, collectively \"Tradu\". The provided information is not directed at residents of the United States, Canada, United Kingdom, European Union, Hong Kong, Australia, Israel or Japan and is not intended for distribution to, or use by, any person in any country or jurisdiction where such distribution or use would be contrary to local law or regulation. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default.",
  },
  {
    entity: "ROW",
    silo: null,
    kind: "row-disclaimer",
    text:
      "Stratos Global LLC is incorporated in St Vincent and the Grenadines with company registration No. 1776 LLC 2022. Stratos Global LLC is not required to hold any financial services license or authorization in St Vincent and the Grenadine in order to provide products and services related to foreign exchange and CFD’s. Registered address: Euro House, Richmond Hill Road, Kingstown, VC0100, Saint Vincent and the Grenadines. Stratos Systems Limited with company registration No. 8430582-1 is a Securities Dealer licensed by the Financial Services Authority Seychelles (license number: SD147), providing listed shares. Registered address: Block B, Global Village, Jivan’s Complex, Mont Fleuri, Mahe, Seychelles. Stratos Tech Limited is an entity incorporated in Seychelles with company registration No. 8434996-1, providing virtual assets. Registered address: Suite 3, Global Village, Jivan’s Complex, Mont-Fleuri, Mahe, Seychelles. Above mentioned entities are subsidiaries within the same corporate group, collectively \"Tradu\". The provided information is not directed at residents of the United States, Canada, United Kingdom, European Union, Hong Kong, Australia, Israel or Japan and is not intended for distribution to, or use by, any person in any country or jurisdiction where such distribution or use would be contrary to local law or regulation. We shall not be liable to you for any losses or damages except to the extent such losses or damages arise directly from our own negligence, fraud or wilful default. You can opt-out of all Tradu marketing communications at any time. If you hold a live account with us, please note that opting-out of marketing communications does not affect the receipt of important business and/or account related communications.",
  },
];

const LINK_RULE_DATA = [
  { entity: "UK", silo: null, emailType: "marketing", kind: "facebook", matchType: "contains", hrefPattern: "facebook.com/tradu" },
  { entity: "UK", silo: null, emailType: "marketing", kind: "instagram", matchType: "contains", hrefPattern: "instagram.com" },
  { entity: "UK", silo: null, emailType: "marketing", kind: "linkedin", matchType: "contains", hrefPattern: "linkedin.com" },
  { entity: "UK", silo: null, emailType: "marketing", kind: "opt-out", matchType: "contains", hrefPattern: "unsubscribe" },
  { entity: "UK", silo: null, emailType: "marketing", kind: "logo", matchType: "contains", hrefPattern: "tradu.com" },
  { entity: "EU", silo: null, emailType: "marketing", kind: "facebook", matchType: "contains", hrefPattern: "facebook.com/tradu" },
  { entity: "EU", silo: null, emailType: "marketing", kind: "instagram", matchType: "contains", hrefPattern: "instagram.com" },
  { entity: "EU", silo: null, emailType: "marketing", kind: "linkedin", matchType: "contains", hrefPattern: "linkedin.com" },
  { entity: "EU", silo: null, emailType: "marketing", kind: "opt-out", matchType: "contains", hrefPattern: "unsubscribe" },
  { entity: "EU", silo: null, emailType: "marketing", kind: "logo", matchType: "contains", hrefPattern: "tradu.com" },
  { entity: "ROW", silo: null, emailType: "marketing", kind: "facebook", matchType: "contains", hrefPattern: "facebook.com/tradu" },
  { entity: "ROW", silo: null, emailType: "marketing", kind: "instagram", matchType: "contains", hrefPattern: "instagram.com" },
  { entity: "ROW", silo: null, emailType: "marketing", kind: "linkedin", matchType: "contains", hrefPattern: "linkedin.com" },
  { entity: "ROW", silo: null, emailType: "marketing", kind: "opt-out", matchType: "contains", hrefPattern: "unsubscribe" },
  { entity: "ROW", silo: null, emailType: "marketing", kind: "logo", matchType: "contains", hrefPattern: "tradu.com" },
];

async function seedDisclaimers() {
  for (const entry of DISCLAIMER_DATA) {
    const id = deterministicId("disclaimer", [entry.entity, entry.silo ?? "", entry.kind, entry.text]);
    await prisma.disclaimerRule.upsert({
      where: { id },
      update: {
        entity: entry.entity,
        silo: entry.silo,
        kind: entry.kind,
        text: entry.text,
        version: entry.version ?? "v1",
        active: entry.active ?? true,
        emailType: entry.emailType ?? "marketing",
      },
      create: {
        id,
        entity: entry.entity,
        silo: entry.silo,
        kind: entry.kind,
        text: entry.text,
        version: entry.version ?? "v1",
        active: entry.active ?? true,
        emailType: entry.emailType ?? "marketing",
      },
    });
  }
}

async function seedLinkRules() {
  for (const entry of LINK_RULE_DATA) {
    const id = deterministicId("link", [entry.entity, entry.silo ?? "", entry.emailType ?? "marketing", entry.kind, entry.hrefPattern]);
    await prisma.linkRule.upsert({
      where: { id },
      update: {
        entity: entry.entity,
        silo: entry.silo,
        emailType: entry.emailType ?? "marketing",
        kind: entry.kind,
        matchType: entry.matchType ?? "contains",
        hrefPattern: entry.hrefPattern,
        notes: entry.notes ?? null,
        active: entry.active ?? true,
      },
      create: {
        id,
        entity: entry.entity,
        silo: entry.silo,
        emailType: entry.emailType ?? "marketing",
        kind: entry.kind,
        matchType: entry.matchType ?? "contains",
        hrefPattern: entry.hrefPattern,
        notes: entry.notes ?? null,
        active: entry.active ?? true,
      },
    });
  }
}

async function seedAdditionalRules() {
  for (const entry of additionalRuleData) {
    const id = deterministicId("additional", [entry.topic, entry.silo, entry.entity, entry.text]);
    await prisma.additionalRule.upsert({
      where: { id },
      update: {
        topic: entry.topic,
        silo: entry.silo,
        entity: entry.entity,
        text: entry.text,
        links: entry.links,
        notes: entry.notes,
        version: entry.version ?? "v1",
        active: entry.active ?? true,
      },
      create: {
        id,
        topic: entry.topic,
        silo: entry.silo,
        entity: entry.entity,
        text: entry.text,
        links: entry.links,
        notes: entry.notes,
        version: entry.version ?? "v1",
        active: entry.active ?? true,
      },
    });
  }
}

async function main() {
  await seedDisclaimers();
  await seedLinkRules();
  await seedAdditionalRules();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to seed disclaimers", error);
    await prisma.$disconnect();
    process.exit(1);
  });
