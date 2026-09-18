#!/bin/bash
# test_tag_refresh.sh
# Verifies that repeated Intel searches on an already-tagged target
# REFRESH the existing tag row (same id, later expires_at) rather than
# creating a duplicate row.
#
# Preconditions:
#   - Server running: cd backend && node src/server.js &
#   - Shino (attacker) and Phantom (target) both alive, both in London
#   - Shino has >= 2 AP and >= 4000 credits (2x Global Satellite Hack)
#
# Usage: bash backend/scratch/test_tag_refresh.sh

set -e

BASE_URL="http://localhost:3001"
SHINO_EMAIL="shino01@gmail.com"
SHINO_PASSWORD="password"
LONDON_CITY_ID="5fc290fb-fac2-430c-b47f-575b5f116f13"
GLOBAL_SAT_HACK_SKILL_ID="9fd00dc0-b553-4b79-bc3d-444f57a120a7"
TARGET_NAME="Phantom"

echo "=== TAG REFRESH TEST ==="
echo

echo "[1/5] Logging in as Shino..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SHINO_EMAIL\",\"password\":\"$SHINO_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not log in as Shino."
  echo "Response: $LOGIN_RESPONSE"
  echo "(If this looks like 'Invalid email or password' but credentials are correct,"
  echo " check whether the Supabase project has auto-paused from inactivity.)"
  exit 1
fi
echo "  OK - token acquired"
echo

echo "[2/5] Checking Shino has enough AP for two searches..."
CHAR_RESPONSE=$(curl -s "$BASE_URL/api/character/me" -H "Authorization: Bearer $TOKEN")
CURRENT_AP=$(echo "$CHAR_RESPONSE" | grep -o '"current_ap":[0-9]*' | grep -o '[0-9]*')
echo "  current_ap=$CURRENT_AP"
while [ "$CURRENT_AP" -lt 2 ]; do
  echo "  AP too low ($CURRENT_AP), triggering regen..."
  curl -s -X POST "$BASE_URL/api/test/trigger-ap-regen" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"character_id\":\"d110a83a-f383-4556-b197-f0d551ec1525\"}" > /dev/null
  CHAR_RESPONSE=$(curl -s "$BASE_URL/api/character/me" -H "Authorization: Bearer $TOKEN")
  CURRENT_AP=$(echo "$CHAR_RESPONSE" | grep -o '"current_ap":[0-9]*' | grep -o '[0-9]*')
done
echo "  AP now sufficient: $CURRENT_AP"
echo

echo "[3/5] First Intel search (Global Satellite Hack on Phantom)..."
SEARCH1=$(curl -s -X POST "$BASE_URL/api/intel/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_name\":\"$TARGET_NAME\",\"target_city_id\":\"$LONDON_CITY_ID\",\"skill_id\":\"$GLOBAL_SAT_HACK_SKILL_ID\",\"is_sweep\":false}")
echo "  Response: $SEARCH1"

TAGS1=$(curl -s "$BASE_URL/api/intel/tags" -H "Authorization: Bearer $TOKEN")
TAG_ID_1=$(echo "$TAGS1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
EXPIRES_1=$(echo "$TAGS1" | grep -o '"expires_at":"[^"]*"' | head -1 | cut -d'"' -f4)
COUNT_1=$(echo "$TAGS1" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "  tag_id=$TAG_ID_1  expires_at=$EXPIRES_1  count=$COUNT_1"
echo

echo "[4/5] Second Intel search on same target (should REFRESH, not duplicate)..."
SEARCH2=$(curl -s -X POST "$BASE_URL/api/intel/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_name\":\"$TARGET_NAME\",\"target_city_id\":\"$LONDON_CITY_ID\",\"skill_id\":\"$GLOBAL_SAT_HACK_SKILL_ID\",\"is_sweep\":false}")
echo "  Response: $SEARCH2"

TAGS2=$(curl -s "$BASE_URL/api/intel/tags" -H "Authorization: Bearer $TOKEN")
TAG_ID_2=$(echo "$TAGS2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
EXPIRES_2=$(echo "$TAGS2" | grep -o '"expires_at":"[^"]*"' | head -1 | cut -d'"' -f4)
COUNT_2=$(echo "$TAGS2" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
echo "  tag_id=$TAG_ID_2  expires_at=$EXPIRES_2  count=$COUNT_2"
echo

echo "[5/5] Verifying refresh behavior..."
PASS=true

if [ "$TAG_ID_1" != "$TAG_ID_2" ]; then
  echo "  FAIL: tag id changed ($TAG_ID_1 -> $TAG_ID_2) - a duplicate row was created"
  PASS=false
else
  echo "  OK: tag id unchanged ($TAG_ID_2)"
fi

if [ "$EXPIRES_1" == "$EXPIRES_2" ]; then
  echo "  FAIL: expires_at did not change - refresh did not update expiry"
  PASS=false
else
  echo "  OK: expires_at advanced ($EXPIRES_1 -> $EXPIRES_2)"
fi

if [ "$COUNT_2" != "1" ]; then
  echo "  FAIL: expected exactly 1 active tag, got $COUNT_2"
  PASS=false
else
  echo "  OK: active tag count still 1"
fi

echo
if [ "$PASS" = true ]; then
  echo "=== PASS: repeated search refreshed the tag, no duplicate created ==="
  exit 0
else
  echo "=== FAIL: see above ==="
  exit 1
fi
