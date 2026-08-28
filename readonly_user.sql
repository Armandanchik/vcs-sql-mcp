-- ---------------------------------------------------------------------------
-- VCS: read-only MySQL vartotojas MCP serveriui
--
-- Paleiskite VIENĄ KARTĄ prieš prijungiant Claude.
-- Tai yra tikroji apsauga. Serverio kodo patikrinimai yra tik antras sluoksnis.
--
-- PRIEŠ PALEIDŽIANT: pakeiskite slaptažodį eilutėje žemiau.
-- ---------------------------------------------------------------------------

-- 1. Sukuriame vartotoją
CREATE USER IF NOT EXISTS 'vcs_readonly'@'%'
  IDENTIFIED BY 'PAKEISKITE-SI-SLAPTAZODI';

-- 2. Duodame TIK skaitymo teisę ir TIK vienai bazei
GRANT SELECT ON vcs_shop.* TO 'vcs_readonly'@'%';

-- 3. Ribojame apkrovą, kad viena grupė neužmuštų serverio
--    (60 užklausų per valandą vienam studentui būtų per mažai, todėl imame su atsarga)
ALTER USER 'vcs_readonly'@'%'
  WITH MAX_QUERIES_PER_HOUR 5000
       MAX_CONNECTIONS_PER_HOUR 500
       MAX_USER_CONNECTIONS 30;

FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------------
-- PATIKRA: paleiskite šitas eilutes ir įsitikinkite, kad matote tik SELECT
-- ---------------------------------------------------------------------------
SHOW GRANTS FOR 'vcs_readonly'@'%';

-- Laukiamas rezultatas:
--   GRANT USAGE ON *.* TO `vcs_readonly`@`%` ...
--   GRANT SELECT ON `vcs_shop`.* TO `vcs_readonly`@`%`
--
-- Jei matote INSERT, UPDATE, DELETE, DROP arba ALL PRIVILEGES - STOP.
-- Atšaukite teises ir kartokite nuo pradžių:
--   REVOKE ALL PRIVILEGES ON *.* FROM 'vcs_readonly'@'%';

-- ---------------------------------------------------------------------------
-- PAPILDOMA PATIKRA: prisijunkite Workbench'e kaip vcs_readonly ir pabandykite
-- ---------------------------------------------------------------------------
-- SELECT COUNT(*) FROM vcs_shop.uzsakymai;   -- turi suveikti
-- DELETE FROM vcs_shop.uzsakymai;            -- turi grąžinti "command denied"
