# PanAfricanMines — Hosting- & Go-Live-Handbuch

**Für:** die Person, die das Backend installiert, betreibt und die Website live schaltet
**Stand:** Version 1.0 des Backends
**Voraussetzungen an die Leserin/den Leser:** Grundkenntnisse Linux-Kommandozeile, DNS und SSH. Spezielles Node.js- oder PostgreSQL-Wissen ist *nicht* nötig — dieses Handbuch führt Schritt für Schritt durch alles.

> Alle Befehle sind so angegeben, dass sie kopiert und eingefügt werden können. Platzhalter in spitzen Klammern wie `<IHRE-DOMAIN>` müssen Sie ersetzen.

---

## Inhalt

1. Was wird betrieben (Architektur in 2 Minuten)
2. Voraussetzungen
3. Welche Hosting-Variante? (Entscheidungshilfe)
4. Variante A — Empfohlen: Docker Compose auf einem eigenen Server
5. Variante B — Ohne Docker: Node + systemd + separater PostgreSQL
6. Umgebungsvariablen richtig setzen (Referenz)
7. Domain, Reverse-Proxy und HTTPS
8. Die bestehende Website anbinden
9. E-Mail-Versand (SMTP) einrichten
10. Operator-Zugänge verwalten
11. Sicherheits-Härtung
12. Datensicherung (Backups)
13. Überwachung (Monitoring & Health-Checks)
14. Updates einspielen & Rollback
15. Fehlerbehebung (häufige Probleme)
16. **Go-Live-Checkliste** zum Abhaken

---

## 1. Was wird betrieben (Architektur in 2 Minuten)

Die Lösung besteht aus drei Teilen:

1. **Die Website (Frontend):** die bestehende `PanAfricanMines.html` plus die mitgelieferte Datei `panafricanmines-api.js`. Das ist statischer Inhalt, der im Browser läuft.
2. **Das Backend (diese Anwendung):** ein Node.js-Dienst, der eine JSON-Schnittstelle unter `/api/v1` bereitstellt. Er enthält die gesamte Geschäftslogik (Inserate, Freigaben, Gebühren, E-Mail-Alerts, Operator-Login).
3. **Die Datenbank:** PostgreSQL. Hier liegen alle Daten dauerhaft.

Der Datenfluss im Betrieb:

```
Besucher-Browser  ──HTTPS──►  Reverse-Proxy (nginx)  ──►  Backend (Node, Port 8080)  ──►  PostgreSQL
   (Website + API-Client)         (TLS/Zertifikat)            (Anwendungslogik)            (Daten)
```

Der Reverse-Proxy nimmt den verschlüsselten Datenverkehr (HTTPS) entgegen und leitet ihn intern an das Backend weiter. Das Backend selbst muss **nicht** direkt aus dem Internet erreichbar sein.

---

## 2. Voraussetzungen

**Server**
- Ein Linux-Server (Ubuntu 22.04 LTS oder 24.04 LTS empfohlen), z. B. ein VPS bei Hetzner, DigitalOcean, AWS Lightsail o. ä.
- Mindestens 1 vCPU, 2 GB RAM, 20 GB Speicher für den Start. 2 vCPU / 4 GB RAM sind komfortabler.
- Root- oder `sudo`-Zugriff per SSH.

**Domain**
- Eine Domain oder Subdomain, auf die Sie DNS-Einträge setzen können (z. B. `panafricanmines.com` und `api.panafricanmines.com`).

**Software** (wird in den jeweiligen Varianten installiert)
- Entweder **Docker + Docker Compose** (Variante A), *oder*
- **Node.js 20+** und **PostgreSQL 14+** (Variante B).

**Mitgelieferte Dateien**
- Das ZIP-Paket `panafricanmines-backend.zip` (das gesamte Backend).
- Darin enthalten u. a.: `README.md`, `INTEGRATION.md`, `openapi.yaml`, `Dockerfile`, `docker-compose.yml`, `.env.example`, der Ordner `src/`, der Ordner `public-integration/` (Frontend-Client).

---

## 3. Welche Hosting-Variante?

| | Variante A: Docker Compose | Variante B: Node + systemd |
|---|---|---|
| Aufwand | Gering — Datenbank kommt mit | Mittel — DB separat einrichten |
| Ideal für | Einen einzelnen Server, schneller Start | Bestehende Infrastruktur, managed DB |
| Datenbank | Im Container (oder extern) | Separat (lokal oder managed) |
| Empfehlung | **Für die meisten Fälle** | Wenn IT-Richtlinien Docker ausschließen |

Wenn Sie unsicher sind: **Variante A.** Wer eine verwaltete Datenbank des Hosters nutzen möchte (mit automatischen Backups), kombiniert Variante A für das Backend mit einer externen `DATABASE_URL` (siehe Abschnitt 6).

---

## 4. Variante A — Docker Compose auf einem eigenen Server (empfohlen)

### 4.1 Server vorbereiten

Per SSH einloggen und Docker installieren:

```bash
ssh root@<SERVER-IP>

# System aktualisieren
apt update && apt -y upgrade

# Docker + Compose-Plugin installieren (offizielles Skript)
curl -fsSL https://get.docker.com | sh

# Prüfen
docker --version
docker compose version
```

### 4.2 Das Backend auf den Server bringen

Laden Sie `panafricanmines-backend.zip` auf den Server (z. B. mit `scp` von Ihrem Rechner) und entpacken Sie es:

```bash
# auf Ihrem lokalen Rechner:
scp panafricanmines-backend.zip root@<SERVER-IP>:/opt/

# wieder auf dem Server:
cd /opt
apt -y install unzip
unzip panafricanmines-backend.zip -d panafricanmines-backend
cd panafricanmines-backend
```

### 4.3 Konfiguration anlegen (`.env`)

```bash
cp .env.example .env
nano .env        # oder ein anderer Editor
```

Setzen Sie **mindestens** folgende Werte (Details in Abschnitt 6):

- `JWT_SECRET` — eine lange Zufallszeichenkette. Erzeugen mit:
  ```bash
  openssl rand -hex 48
  ```
  Den ausgegebenen Wert in `.env` bei `JWT_SECRET=` eintragen.
- `SEED_OPERATOR_EMAIL` und `SEED_OPERATOR_PASSWORD` — der erste Backoffice-Login. Wählen Sie ein starkes Passwort; es wird nach dem ersten Login geändert.
- `CORS_ORIGIN` — die genaue Adresse Ihrer Website, z. B. `https://panafricanmines.com,https://www.panafricanmines.com`.
- `PUBLIC_SITE_URL` — z. B. `https://panafricanmines.com` (wird in E-Mail-Links verwendet).
- SMTP-Daten für den E-Mail-Versand (Abschnitt 9) — kann anfangs leer bleiben; dann werden E-Mails nur ins Log geschrieben statt versendet.

> **Wichtig:** Lassen Sie `SEED_SAMPLE_LISTINGS=false` für den Echtbetrieb. Auf `true` würde der Demodatensatz (44 Beispiel-Inserate) geladen.

Damit die Datenbank beim ersten Start automatisch eingerichtet und befüllt wird, sind in der mitgelieferten `docker-compose.yml` bereits gesetzt:
`RUN_MIGRATIONS_ON_BOOT=true` und `SEED_ON_BOOT=true`. Sie müssen hier nichts ändern.

### 4.4 Datenbank-Passwort setzen

Die `docker-compose.yml` nutzt eine eingebaute PostgreSQL. Setzen Sie ein eigenes Datenbank-Passwort, indem Sie es ebenfalls in `.env` aufnehmen:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" >> .env
```

Compose verwendet diesen Wert automatisch sowohl für die Datenbank als auch für die `DATABASE_URL` des Backends.

### 4.5 Starten

```bash
docker compose up -d --build
```

Beim ersten Start wird das Image gebaut, die Datenbank hochgefahren, die Datenbankstruktur angelegt (Migrationen) und mit den Stammdaten plus dem Operator-Zugang befüllt.

### 4.6 Funktion prüfen

```bash
# Läuft der Dienst?
docker compose ps

# Logs ansehen (mit Strg+C verlassen)
docker compose logs -f api

# Gesundheitscheck (sollte {"status":"ok",...} liefern)
curl http://localhost:8080/healthz

# Datenbank-Bereitschaft (sollte {"status":"ready"} liefern)
curl http://localhost:8080/readyz

# Stammdaten abrufen
curl http://localhost:8080/api/v1/reference | head
```

Wenn `/readyz` `ready` meldet, läuft das Backend samt Datenbank korrekt. Weiter geht es mit Domain und HTTPS (Abschnitt 7).

---

## 5. Variante B — Ohne Docker: Node + systemd + separater PostgreSQL

Diese Variante eignet sich, wenn Sie eine vorhandene oder verwaltete PostgreSQL nutzen und Node direkt auf dem Server betreiben möchten.

### 5.1 Node.js 20 installieren

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
node --version    # sollte v20.x oder höher zeigen
```

### 5.2 PostgreSQL bereitstellen

Entweder eine **verwaltete** PostgreSQL beim Hoster bestellen (empfohlen — inkl. Backups) und die Verbindungs-URL notieren, **oder** lokal installieren:

```bash
apt -y install postgresql
sudo -u postgres psql -c "CREATE USER pam WITH PASSWORD '<DB-PASSWORT>';"
sudo -u postgres psql -c "CREATE DATABASE panafricanmines OWNER pam;"
```

Die Verbindungs-URL lautet dann:
`postgres://pam:<DB-PASSWORT>@localhost:5432/panafricanmines`

### 5.3 Code und Abhängigkeiten

```bash
cd /opt
unzip panafricanmines-backend.zip -d panafricanmines-backend
cd panafricanmines-backend
npm install --omit=dev      # nur Produktionsabhängigkeiten
cp .env.example .env
nano .env
```

In `.env` mindestens setzen: `DATABASE_URL` (die URL aus 5.2), `JWT_SECRET` (mit `openssl rand -hex 48`), `SEED_OPERATOR_*`, `CORS_ORIGIN`, `PUBLIC_SITE_URL`. Bei verwalteter DB zusätzlich `PGSSLMODE=require`.

### 5.4 Datenbank einrichten und befüllen

```bash
npm run migrate          # legt alle Tabellen an
npm run seed             # Stammdaten + erster Operator-Zugang
```

### 5.5 Als Dienst einrichten (systemd)

Damit das Backend automatisch startet und nach einem Absturz neu hochfährt:

```bash
nano /etc/systemd/system/panafricanmines.service
```

Inhalt:

```ini
[Unit]
Description=PanAfricanMines API
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/panafricanmines-backend
EnvironmentFile=/opt/panafricanmines-backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=3
User=www-data
# Migrationen beim Start anwenden, aber nicht erneut seeden:
Environment=RUN_MIGRATIONS_ON_BOOT=true
Environment=SEED_ON_BOOT=false

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:

```bash
# Dateirechte, damit www-data lesen darf
chown -R www-data:www-data /opt/panafricanmines-backend

systemctl daemon-reload
systemctl enable --now panafricanmines
systemctl status panafricanmines        # sollte "active (running)" zeigen

# Funktion prüfen
curl http://localhost:8080/readyz
```

Logs ansehen: `journalctl -u panafricanmines -f`

---

## 6. Umgebungsvariablen richtig setzen (Referenz)

Alle Einstellungen erfolgen über die Datei `.env`. Die wichtigsten:

| Variable | Bedeutung | Beispiel / Empfehlung |
|---|---|---|
| `DATABASE_URL` | Verbindung zur PostgreSQL | `postgres://pam:…@db:5432/panafricanmines` |
| `PGSSLMODE` | TLS zur Datenbank | bei verwalteter DB: `require`, sonst `disable` |
| `JWT_SECRET` | Signiert Operator-Logins | **lang & zufällig**, `openssl rand -hex 48` |
| `JWT_EXPIRES_IN` | Gültigkeit eines Logins | `12h` (Standard) |
| `PORT` | Interner Port des Backends | `8080` |
| `CORS_ORIGIN` | Erlaubte Website-Adressen | exakte Domain(s), **kein** `*` im Echtbetrieb |
| `SEED_OPERATOR_EMAIL` | Erster Backoffice-Login | `ops@stramin.africa` |
| `SEED_OPERATOR_PASSWORD` | Passwort des ersten Logins | starkes Passwort, danach ändern |
| `SEED_SAMPLE_LISTINGS` | Demodaten laden | **`false`** im Echtbetrieb |
| `SEED_ON_BOOT` | Beim Start automatisch seeden | `true` für ersten Container-Start, sonst `false` |
| `RUN_MIGRATIONS_ON_BOOT` | Beim Start DB-Struktur aktualisieren | `true` |
| `MATCHING_FEE_RATE` | Vermittlungsgebühr | `0.10` (= 10 %) |
| `SMTP_HOST` u. a. | E-Mail-Versand | siehe Abschnitt 9 |
| `MAIL_FROM` | Absenderadresse | `PanAfricanMines <no-reply@…>` |
| `OPS_NOTIFY_EMAIL` | Postfach für Benachrichtigungen | Adresse Ihres Teams |
| `PUBLIC_SITE_URL` | Basis für Links in E-Mails | `https://panafricanmines.com` |
| `RATE_LIMIT_MAX` | Anfragen pro Zeitfenster/IP | `100` (Standard) |

> Das Backend **verweigert den Start in Produktion**, wenn `JWT_SECRET` auf dem unsicheren Standardwert steht. Das ist Absicht — bitte immer einen eigenen Wert setzen.

---

## 7. Domain, Reverse-Proxy und HTTPS

Ziel: Besucher erreichen die Website unter `https://panafricanmines.com`, und der API-Client spricht das Backend unter `https://api.panafricanmines.com` an. Der Reverse-Proxy übernimmt die Verschlüsselung.

### 7.1 DNS-Einträge

Setzen Sie beim Domain-Anbieter zwei A-Einträge auf die IP-Adresse Ihres Servers:

```
panafricanmines.com        A    <SERVER-IP>
api.panafricanmines.com    A    <SERVER-IP>
```

(Bei Bedarf zusätzlich `www.panafricanmines.com`.) Die Verbreitung kann einige Minuten bis Stunden dauern.

### 7.2 nginx und Zertifikate installieren

```bash
apt -y install nginx certbot python3-certbot-nginx
```

### 7.3 nginx-Konfiguration für das Backend (API)

```bash
nano /etc/nginx/sites-available/panafricanmines-api
```

Inhalt:

```nginx
server {
    listen 80;
    server_name api.panafricanmines.com;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

> Das Backend ist auf einen Reverse-Proxy vorbereitet (`trust proxy` ist aktiv), daher werden die `X-Forwarded-*`-Header korrekt ausgewertet — wichtig für echte Besucher-IPs und das Rate-Limiting.

### 7.4 nginx-Konfiguration für die Website (statische Dateien)

Legen Sie die Website-Dateien z. B. nach `/var/www/panafricanmines/` (siehe Abschnitt 8) und konfigurieren Sie:

```bash
nano /etc/nginx/sites-available/panafricanmines-web
```

```nginx
server {
    listen 80;
    server_name panafricanmines.com www.panafricanmines.com;
    root /var/www/panafricanmines;
    index PanAfricanMines.html;

    location / {
        try_files $uri $uri/ /PanAfricanMines.html;
    }
}
```

### 7.5 Aktivieren und HTTPS einrichten

```bash
ln -s /etc/nginx/sites-available/panafricanmines-api  /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/panafricanmines-web  /etc/nginx/sites-enabled/
nginx -t            # Konfiguration testen
systemctl reload nginx

# Kostenlose TLS-Zertifikate von Let's Encrypt holen (richtet HTTPS automatisch ein)
certbot --nginx -d panafricanmines.com -d www.panafricanmines.com -d api.panafricanmines.com
```

Certbot stellt die Verschlüsselung ein und erneuert die Zertifikate künftig automatisch. Danach sind beide Adressen über `https://` erreichbar.

### 7.6 Firewall

```bash
apt -y install ufw
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Damit sind nur SSH (22), HTTP (80) und HTTPS (443) offen. Backend (8080) und Datenbank (5432) sind von außen **nicht** erreichbar — genau so soll es sein.

---

## 8. Die bestehende Website anbinden

Die Website besteht aus der vorhandenen HTML-Datei und dem mitgelieferten API-Client. Zwei kleine Schritte:

**1. Dateien bereitstellen**

```bash
mkdir -p /var/www/panafricanmines
# Die bestehende HTML-Datei und den Client dorthin kopieren:
cp PanAfricanMines.html /var/www/panafricanmines/
cp public-integration/panafricanmines-api.js /var/www/panafricanmines/
chown -R www-data:www-data /var/www/panafricanmines
```

**2. Den Client in der HTML-Datei einbinden und auf die API zeigen**

Fügen Sie im `<head>` oder direkt vor dem bestehenden `<script>`-Block der HTML-Datei ein:

```html
<script src="panafricanmines-api.js"></script>
<script>
  PamAPI.configure({ baseUrl: 'https://api.panafricanmines.com/api/v1' });
</script>
```

Die genaue Umstellung der einzelnen Funktionen (Inserate laden, „Asset einreichen", Alerts, Backoffice usw.) ist Aufgabe der Entwicklung und ist Schritt für Schritt im Dokument **`INTEGRATION.md`** beschrieben. Für das reine Hosting genügt es zu wissen: Die Website lädt ihre Daten über `https://api.panafricanmines.com/api/v1`, und diese Adresse muss in `CORS_ORIGIN` des Backends als erlaubte Herkunft eingetragen sein (siehe Abschnitt 6).

> **Test der Anbindung:** Öffnen Sie die Website im Browser, drücken Sie F12 (Entwicklerkonsole) und prüfen Sie unter „Network", dass Aufrufe an `api.panafricanmines.com` mit Status 200 zurückkommen. CORS-Fehler in der Konsole bedeuten fast immer, dass `CORS_ORIGIN` nicht exakt der aufrufenden Adresse entspricht.

---

## 9. E-Mail-Versand (SMTP) einrichten

Das Backend versendet E-Mails für: Alert-Benachrichtigungen an Interessenten, Bestätigungen an Verkäufer sowie interne Benachrichtigungen an Ihr Team.

- **Ohne Konfiguration** (leeres `SMTP_HOST`) werden E-Mails **nicht** versendet, sondern nur in die Logs geschrieben. Das ist für Tests in Ordnung, aber **nicht** für den Echtbetrieb.
- **Für den Echtbetrieb** tragen Sie die Zugangsdaten Ihres E-Mail-Anbieters (z. B. ein Transaktions-Dienst wie Postmark, SendGrid, Mailgun, Amazon SES, oder ein eigener SMTP-Server) in `.env` ein:

```ini
SMTP_HOST=smtp.ihr-anbieter.de
SMTP_PORT=587
SMTP_SECURE=false          # true nur bei Port 465
SMTP_USER=<benutzername>
SMTP_PASS=<passwort-oder-api-key>
MAIL_FROM="PanAfricanMines <no-reply@panafricanmines.com>"
OPS_NOTIFY_EMAIL=ops@stramin.africa
```

Nach Änderungen den Dienst neu starten (`docker compose up -d` bzw. `systemctl restart panafricanmines`).

> **Zustellbarkeit:** Damit E-Mails nicht im Spam landen, richten Sie beim Domain-Anbieter SPF- und DKIM-Einträge gemäß den Vorgaben Ihres E-Mail-Dienstes ein. Das ist eine DNS-Aufgabe und unabhängig vom Backend.

---

## 10. Operator-Zugänge verwalten

Der erste Zugang wird beim Seeden aus `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD` erstellt. **Ändern Sie das Passwort umgehend** und legen Sie persönliche Zugänge für die einzelnen Mitarbeitenden an.

Weiteren Operator anlegen oder Passwort zurücksetzen:

```bash
# Variante A (Docker):
docker compose exec api npm run create-operator -- <email> '<passwort>' "<Name>" admin

# Variante B (Node direkt):
npm run create-operator -- <email> '<passwort>' "<Name>" admin
```

Der Login erfolgt im Backoffice-Bereich der Website (E-Mail + Passwort). Ein Login ist standardmäßig 12 Stunden gültig (`JWT_EXPIRES_IN`).

---

## 11. Sicherheits-Härtung

Vor dem Go-Live unbedingt prüfen:

- `JWT_SECRET` ist ein eigener, langer Zufallswert (nicht der Standard).
- `SEED_OPERATOR_PASSWORD` wurde nach dem ersten Login geändert.
- `CORS_ORIGIN` enthält nur die echten Website-Adressen, **nicht** `*`.
- Backend (8080) und PostgreSQL (5432) sind **nicht** aus dem Internet erreichbar (Firewall, siehe 7.6). In Variante A nicht den Port 5432 in `docker-compose.yml` veröffentlichen (er ist standardmäßig auskommentiert — so lassen).
- HTTPS ist aktiv und erzwungen (certbot richtet die Weiterleitung von HTTP auf HTTPS ein).
- Bei verwalteter Datenbank: `PGSSLMODE=require`.
- SSH abgesichert (Schlüssel statt Passwort, Root-Login ggf. deaktivieren).
- Automatische Sicherheitsupdates des Betriebssystems aktiviert:
  ```bash
  apt -y install unattended-upgrades
  dpkg-reconfigure -plow unattended-upgrades
  ```

Eingebaut sind bereits: Schutz-Header (helmet), CORS-Beschränkung, Rate-Limiting auf schreibende Endpunkte, Eingabe-Validierung und ein Audit-Log aller Statusänderungen.

---

## 12. Datensicherung (Backups)

**Die Datenbank ist das einzige, was unwiederbringlich ist** — Code und Konfiguration lassen sich jederzeit neu ausrollen. Sichern Sie daher regelmäßig die PostgreSQL.

**Manuelles Backup (Variante A):**

```bash
docker compose exec -T db pg_dump -U pam panafricanmines | gzip > pam-backup-$(date +%F).sql.gz
```

**Manuelles Backup (Variante B / lokale DB):**

```bash
sudo -u postgres pg_dump panafricanmines | gzip > pam-backup-$(date +%F).sql.gz
```

**Automatisch täglich** (Beispiel für Variante A) — per Cron:

```bash
crontab -e
# folgende Zeile ergänzt ein tägliches Backup um 02:30 Uhr:
30 2 * * * cd /opt/panafricanmines-backend && docker compose exec -T db pg_dump -U pam panafricanmines | gzip > /var/backups/pam-$(date +\%F).sql.gz
```

Legen Sie das Backup-Verzeichnis an (`mkdir -p /var/backups`) und kopieren Sie die Sicherungen zusätzlich an einen externen Ort (anderer Server, Objektspeicher). Testen Sie gelegentlich die Wiederherstellung.

**Wiederherstellung (Beispiel Variante A):**

```bash
gunzip -c pam-backup-2026-06-05.sql.gz | docker compose exec -T db psql -U pam -d panafricanmines
```

> Bei einer **verwalteten** Datenbank des Hosters sind automatische Backups meist inklusive — dann genügt es, diese zu aktivieren und die Aufbewahrungsdauer zu prüfen.

---

## 13. Überwachung (Monitoring & Health-Checks)

Das Backend stellt zwei Prüf-Endpunkte bereit:

- `GET /healthz` — der Dienst läuft (Liveness).
- `GET /readyz` — der Dienst **und** die Datenbank sind bereit (Readiness). Liefert `503`, wenn die DB nicht erreichbar ist.

Nutzen Sie diese für eine externe Überwachung (z. B. UptimeRobot, Better Stack, oder die Health-Checks Ihres Hosters), die `https://api.panafricanmines.com/readyz` regelmäßig abruft und bei Ausfall alarmiert.

**Logs einsehen:**

```bash
# Variante A:
docker compose logs -f api

# Variante B:
journalctl -u panafricanmines -f
```

In Variante A ist zusätzlich ein Container-Health-Check eingebaut (`docker compose ps` zeigt den Zustand).

---

## 14. Updates einspielen & Rollback

Wenn eine neue Version des Backends geliefert wird:

**Variante A (Docker):**

```bash
cd /opt/panafricanmines-backend
# vorher: Backup erstellen (Abschnitt 12)!
# neue Dateien einspielen (z. B. neues ZIP entpacken, .env behalten)
docker compose up -d --build
```

Etwaige neue Datenbank-Änderungen werden beim Start automatisch und transaktional angewendet (Migrationen werden in der Tabelle `schema_migrations` festgehalten und nie doppelt ausgeführt).

**Variante B (Node):**

```bash
cd /opt/panafricanmines-backend
# Backup erstellen!
npm install --omit=dev
npm run migrate
systemctl restart panafricanmines
```

**Rollback:** Da Migrationen additiv und transaktional sind, ist der sichere Weg im Problemfall: vorherige Code-Version wieder einspielen und — falls nötig — das vor dem Update erstellte Datenbank-Backup wiederherstellen (Abschnitt 12). Deshalb **immer vor einem Update sichern.**

---

## 15. Fehlerbehebung (häufige Probleme)

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Dienst startet nicht, Log nennt `JWT_SECRET` | Standard-Secret in Produktion | Eigenen Wert setzen (`openssl rand -hex 48`) und neu starten |
| `/readyz` liefert 503 | DB nicht erreichbar | `DATABASE_URL` prüfen; läuft die DB? Bei verwalteter DB `PGSSLMODE=require` |
| Website lädt, aber keine Daten; CORS-Fehler in der Konsole | `CORS_ORIGIN` passt nicht | exakte Website-Adresse(n) in `.env` eintragen, neu starten |
| Aufrufe an die API schlagen mit „Mixed Content" fehl | Website über HTTPS, API über HTTP | API ebenfalls über `https://` ansprechen (Abschnitt 7) |
| Operator-Login schlägt fehl | Falsche Zugangsdaten / Zugang fehlt | Mit `create-operator` Zugang anlegen/zurücksetzen (Abschnitt 10) |
| Keine E-Mails kommen an | SMTP nicht konfiguriert | SMTP-Daten setzen (Abschnitt 9); SPF/DKIM prüfen |
| 429-Fehler bei vielen Anfragen | Rate-Limit greift | normal als Schutz; bei Bedarf `RATE_LIMIT_MAX` erhöhen |
| Port 8080 von außen erreichbar | Firewall/Compose-Port offen | Firewall setzen (7.6); Port 5432/8080 nicht veröffentlichen |

Hilfreich zur Eingrenzung: zuerst `curl http://localhost:8080/readyz` **auf dem Server** testen (umgeht Proxy/DNS). Klappt das, liegt das Problem bei nginx/DNS/HTTPS; klappt es nicht, beim Backend oder der Datenbank.

---

## 16. Go-Live-Checkliste

Vor dem Scharfschalten Punkt für Punkt abarbeiten:

- [ ] Server bereit, SSH-Zugang gesichert, OS aktualisiert
- [ ] Backend installiert (Variante A oder B) und gestartet
- [ ] `.env` vollständig: eigenes `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `PUBLIC_SITE_URL`
- [ ] `SEED_SAMPLE_LISTINGS=false` (keine Demodaten im Echtbetrieb)
- [ ] Datenbank migriert und (einmalig) geseedet; `/readyz` liefert `ready`
- [ ] Erster Operator-Zugang funktioniert; **Passwort geändert**; persönliche Zugänge angelegt
- [ ] DNS-Einträge für Website und `api.`-Subdomain gesetzt
- [ ] nginx eingerichtet, HTTPS-Zertifikate via certbot aktiv (Website und API)
- [ ] Firewall aktiv; 8080 und 5432 von außen nicht erreichbar
- [ ] Website-Dateien bereitgestellt, API-Client eingebunden, `baseUrl` gesetzt
- [ ] Anbindung im Browser getestet (Inserate laden, Einreichen, Backoffice-Login)
- [ ] SMTP konfiguriert; Test-E-Mail erhalten; SPF/DKIM gesetzt
- [ ] Backups eingerichtet und eine Wiederherstellung testweise geprüft
- [ ] Externe Überwachung auf `/readyz` eingerichtet

Sind alle Punkte erfüllt, ist die Plattform produktiv betriebsbereit.

---

### Weiterführende mitgelieferte Dokumente
- **`README.md`** — Kurzüberblick, Befehle, Projektstruktur
- **`INTEGRATION.md`** — Anbindung der bestehenden Website an die API (für die Entwicklung)
- **`openapi.yaml`** — vollständige technische API-Spezifikation
