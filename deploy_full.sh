#!/bin/bash
set -e

echo "=== 1. GitHub'dan yangi kodni tortish ==="
cd /home/ubuntu
rm -rf gilam_repo_temp
git clone https://github.com/Jasurbek414/gilam_umumiy.git gilam_repo_temp
echo "  ✓ Repo klonlandi"

REPO=/home/ubuntu/gilam_repo_temp/gilam-platforma-main
FRONT=/home/ubuntu/projects/gilam/frontend
BACK=/home/ubuntu/projects/gilam/node-backend

echo ""
echo "=== 2. DB Migratsiya ==="
# Enum ga yangi qiymatlar qo'shish
sudo -u postgres psql -d gilam_saas -c "ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'MANAGER';" 2>/dev/null || echo "  MANAGER allaqachon mavjud"
sudo -u postgres psql -d gilam_saas -c "ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'WORKER';" 2>/dev/null || echo "  WORKER allaqachon mavjud"
# Yangi ustunlar
sudo -u postgres psql -d gilam_saas -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;" 2>/dev/null || echo "  birth_date allaqachon mavjud"
sudo -u postgres psql -d gilam_saas -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(12,2) DEFAULT 0;" 2>/dev/null || echo "  salary allaqachon mavjud"
# Eski rollarni yangilarga o'tkazish
sudo -u postgres psql -d gilam_saas -c "UPDATE users SET role = 'WORKER' WHERE role = 'WASHER';" 2>/dev/null || true
sudo -u postgres psql -d gilam_saas -c "UPDATE users SET role = 'WORKER' WHERE role = 'FINISHER';" 2>/dev/null || true
echo "  ✓ DB migratsiya bajarildi"

echo ""
echo ""
echo "=== 3. Backend fayllarni yangilash ==="
cp -f "$REPO/backend/src/users/entities/user.entity.ts" "$BACK/src/users/entities/user.entity.ts"
cp -f "$REPO/backend/src/users/dto/user.dto.ts" "$BACK/src/users/dto/user.dto.ts"
cp -f "$REPO/backend/src/users/users.service.ts" "$BACK/src/users/users.service.ts"
cp -f "$REPO/backend/src/orders/orders.controller.ts" "$BACK/src/orders/orders.controller.ts"
cp -f "$REPO/backend/src/app.module.ts" "$BACK/src/app.module.ts"
rm -rf "$BACK/src/audit" "$BACK/src/expenses" "$BACK/src/attendance"
mkdir -p "$BACK/src/audit" "$BACK/src/expenses" "$BACK/src/attendance"
cp -rf "$REPO/backend/src/audit/." "$BACK/src/audit/"
cp -rf "$REPO/backend/src/expenses/." "$BACK/src/expenses/"
cp -rf "$REPO/backend/src/attendance/." "$BACK/src/attendance/"
echo "  ✓ Backend fayllar ko'chirildi"

echo ""
echo "=== 4. Backend build ==="
cd "$BACK"
npm run build
echo "  ✓ Backend build tayyor"

echo ""
echo "=== 5. Frontend fayllarni yangilash ==="
cp -f "$REPO/frontend-app/src/app/page.tsx" "$FRONT/src/app/page.tsx"
mkdir -p "$FRONT/src/app/spd"
cp -f "$REPO/frontend-app/src/app/spd/page.tsx" "$FRONT/src/app/spd/page.tsx"
cp -f "$REPO/frontend-app/src/app/admin/layout.tsx" "$FRONT/src/app/admin/layout.tsx"
cp -f "$REPO/frontend-app/src/app/admin/companies/page.tsx" "$FRONT/src/app/admin/companies/page.tsx"
cp -f "$REPO/frontend-app/src/app/company/layout.tsx" "$FRONT/src/app/company/layout.tsx"
cp -f "$REPO/frontend-app/src/app/company/page.tsx" "$FRONT/src/app/company/page.tsx"
cp -f "$REPO/frontend-app/src/app/company/orders/page.tsx" "$FRONT/src/app/company/orders/page.tsx"
cp -f "$REPO/frontend-app/src/app/company/finance/page.tsx" "$FRONT/src/app/company/finance/page.tsx"
cp -f "$REPO/frontend-app/src/app/company/finance/components.tsx" "$FRONT/src/app/company/finance/components.tsx"
cp -f "$REPO/frontend-app/src/app/company/staff/page.tsx" "$FRONT/src/app/company/staff/page.tsx"
mkdir -p "$FRONT/src/app/company/settings"
cp -f "$REPO/frontend-app/src/app/company/settings/page.tsx" "$FRONT/src/app/company/settings/page.tsx"
mkdir -p "$FRONT/src/app/company/login"
cp -f "$REPO/frontend-app/src/app/company/login/page.tsx" "$FRONT/src/app/company/login/page.tsx"
cp -f "$REPO/frontend-app/src/lib/api.ts" "$FRONT/src/lib/api.ts"
cp -f "$REPO/frontend-app/src/components/layout/Sidebar.tsx" "$FRONT/src/components/layout/Sidebar.tsx"
cp -f "$REPO/frontend-app/src/components/layout/CompanySidebar.tsx" "$FRONT/src/components/layout/CompanySidebar.tsx"
cp -f "$REPO/frontend-app/src/types/index.ts" "$FRONT/src/types/index.ts"
cp -f "$REPO/frontend-app/src/app/admin/page.tsx" "$FRONT/src/app/admin/page.tsx"
cp -f "$REPO/frontend-app/src/app/admin/users/page.tsx" "$FRONT/src/app/admin/users/page.tsx"
cp -f "$REPO/frontend-app/package.json" "$FRONT/package.json"
echo "  ✓ Frontend fayllar ko'chirildi"

echo ""
echo "=== 6. Frontend build ==="
cd "$FRONT"
npm install
npm run build
echo "  ✓ Frontend build tayyor"

echo ""
echo "=== 7. PM2 restart ==="
pm2 restart gilam-backend
pm2 restart gilam-frontend
pm2 save
echo "  ✓ PM2 restart bajarildi"

echo ""
echo "=== 8. Tozalash ==="
rm -rf /home/ubuntu/gilam_repo_temp
rm -f /home/ubuntu/deploy_full.sh

echo ""
echo "=========================================="
echo "  DEPLOY MUVAFFAQIYATLI YAKUNLANDI! ✅"
echo "=========================================="
pm2 list
