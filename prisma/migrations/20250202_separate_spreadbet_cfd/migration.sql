-- Migration to separate Spread Bet and CFD from combined SB/CFD entries

-- Step 1: Update existing SB/CFD entries to be Spread Bet only
UPDATE "RiskRule"
SET "siloFilter" = 'Spread Bet',
    "text" = 'Spread bets are complex instruments and come with a high risk of losing money rapidly due to leverage. 62% of retail investor accounts lose money when trading spread bets with this provider. You should consider whether you understand how spread bets work and whether you can afford to take the high risk of losing your money. Your capital is at risk.'
WHERE "siloFilter" = 'SB/CFD' AND "variant" = 'cfd_and_spreadbet' AND "entity" = 'UK';

-- Step 2: Create new CFD entries by duplicating existing CFD entries
INSERT INTO "RiskRule" ("id", "entity", "variant", "siloFilter", "text", "version", "active")
SELECT
    gen_random_uuid(),
    "entity",
    "variant",
    'CFD' as "siloFilter",
    REPLACE(REPLACE(
        "text",
        'spread bets and CFDs', 'CFDs'
    ),
    'Spread bets and CFDs', 'CFDs'
    ) as "text",
    "version",
    "active"
FROM "RiskRule"
WHERE "siloFilter" = 'CFD' OR "variant" = 'cfd';

-- Step 3: Update AdditionalRule entries - split SB/CFD into separate entries
-- First, update existing SB/CFD entries to Spread Bet
UPDATE "AdditionalRule"
SET "silo" = 'Spread Bet',
    "text" = REPLACE("text", 'Spread Bet/CFD', 'Spread Bet'),
    "notes" = REPLACE("notes", 'Spread Bet/CFD', 'Spread Bet')
WHERE "silo" = 'SB/CFD';

-- Step 4: Insert new CFD entries from SB/CFD entries
INSERT INTO "AdditionalRule" ("id", "topic", "silo", "entity", "text", "links", "notes", "version", "active")
SELECT
    gen_random_uuid(),
    "topic",
    'CFD' as "silo",
    "entity",
    REPLACE("text", 'Spread Bet/CFD', 'CFD'),
    "links",
    REPLACE("notes", 'Spread Bet/CFD', 'CFD'),
    "version",
    "active"
FROM "AdditionalRule"
WHERE "silo" = 'Spread Bet' AND "topic" IN (
    'Interest rate', 'Best Spread', 'Trusted by traders in over 200 countries',
    'Speed data', 'TipRanks', 'Trade/Invest/CFD', 'Trading View', 'Trading Intelligence'
);

-- Step 5: Update LinkRule entries if any have SB/CFD
UPDATE "LinkRule"
SET "silo" = 'Spread Bet'
WHERE "silo" = 'SB/CFD';

INSERT INTO "LinkRule" ("id", "entity", "silo", "emailType", "kind", "matchType", "hrefPattern", "notes", "active", "createdAt")
SELECT
    gen_random_uuid(),
    "entity",
    'CFD' as "silo",
    "emailType",
    "kind",
    "matchType",
    "hrefPattern",
    "notes",
    "active",
    NOW()
FROM "LinkRule"
WHERE "silo" = 'Spread Bet';

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS "risk_rule_entity_silo_active_idx" ON "RiskRule" ("entity", "siloFilter", "active");
CREATE INDEX IF NOT EXISTS "additional_rule_silo_entity_active_idx" ON "AdditionalRule" ("silo", "entity", "active");