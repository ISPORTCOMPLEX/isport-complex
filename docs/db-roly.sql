-- Najmenšie potrebné oprávnenia v databáze (spusti v Neon → SQL Editor ako vlastník databázy).
-- Heslá NEPÍŠ sem do súboru – zadaj ich priamo v editore a ulož do správcu hesiel.

-- 1) Rola aplikácie: len čítanie a zápis údajov, žiadne zmeny štruktúry (DROP, ALTER, CREATE).
CREATE ROLE isport_app LOGIN PASSWORD 'SEM_NAHODNE_HESLO_1';
GRANT CONNECT ON DATABASE neondb TO isport_app;
GRANT USAGE ON SCHEMA public TO isport_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO isport_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO isport_app;
-- nové tabuľky z budúcich migrácií dostanú tie isté práva automaticky
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO isport_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO isport_app;

-- 2) Rola na zálohy: len čítanie.
CREATE ROLE isport_backup LOGIN PASSWORD 'SEM_NAHODNE_HESLO_2';
GRANT CONNECT ON DATABASE neondb TO isport_backup;
GRANT USAGE ON SCHEMA public TO isport_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO isport_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO isport_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO isport_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO isport_backup;

-- Kontrola: rola aplikácie nesmie vedieť meniť štruktúru (má skončiť chybou "permission denied")
-- Prihlás sa v SQL Editore ako isport_app a skús: CREATE TABLE test_x(id int);  → musí skončiť chybou.
