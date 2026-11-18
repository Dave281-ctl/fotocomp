#!/bin/sh
set -e

# Als root gestartet: Rechte am Fotoordner richten (z.B. auf dem NAS)
# und danach als unprivilegierter User «node» weiterlaufen.
if [ "$(id -u)" = "0" ]; then
	find /data ! -user node -exec chown node:node {} +
	exec su-exec node "$0" "$@"
fi

node scripts/migrate.js
exec node build
