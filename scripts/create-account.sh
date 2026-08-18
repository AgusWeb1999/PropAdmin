#!/usr/bin/env bash
# Crea una empresa (administradora) nueva + su primer usuario COMPANY_ADMIN.
# Uso:
#   ./scripts/create-account.sh "Nombre Empresa" "empresa@email.com" "Nombre" "Apellido" "usuario@email.com" ["password"]
#
# Si no pasás password, se genera una temporal y se muestra al final.
# Por default pega contra producción (Render). Para probar en local:
#   API_URL=http://localhost:4000/api/v1 ./scripts/create-account.sh ...

set -euo pipefail

API_URL="${API_URL:-https://propadmin-api.onrender.com/api/v1}"

if [ "$#" -lt 5 ]; then
  echo "Uso: $0 \"Nombre Empresa\" \"empresa@email.com\" \"Nombre\" \"Apellido\" \"usuario@email.com\" [\"password\"]"
  exit 1
fi

COMPANY_NAME="$1"
COMPANY_EMAIL="$2"
FIRST_NAME="$3"
LAST_NAME="$4"
USER_EMAIL="$5"
PASSWORD="${6:-}"

if [ -z "$PASSWORD" ]; then
  PASSWORD="$(python3 -c "
import secrets, string
alphabet = string.ascii_letters + string.digits
print(''.join(secrets.choice(alphabet) for _ in range(12)) + '!')
")"
  GENERATED=1
else
  GENERATED=0
fi

RESPONSE="$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, sys
print(json.dumps({
  'companyName': sys.argv[1],
  'companyEmail': sys.argv[2],
  'firstName': sys.argv[3],
  'lastName': sys.argv[4],
  'email': sys.argv[5],
  'password': sys.argv[6],
}))
" "$COMPANY_NAME" "$COMPANY_EMAIL" "$FIRST_NAME" "$LAST_NAME" "$USER_EMAIL" "$PASSWORD")")"

echo "$RESPONSE" | python3 -m json.tool

OK="$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")"

if [ "$OK" = "True" ]; then
  echo ""
  echo "✅ Cuenta creada — $COMPANY_NAME / $USER_EMAIL"
  if [ "$GENERATED" = "1" ]; then
    echo "🔑 Contraseña temporal (pasásela al usuario): $PASSWORD"
  fi
else
  echo ""
  echo "❌ Falló la creación — revisá el error de arriba"
  exit 1
fi
