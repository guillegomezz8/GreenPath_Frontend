#!/bin/sh
set -e  # para que el script falle si algún comando falla

# Ejecuta npm install
npm install

# Finalmente ejecuta el comando que pase Docker (por ejemplo 'npm run dev')
exec "$@"
