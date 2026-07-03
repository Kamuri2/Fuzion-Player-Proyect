@echo off
echo Iniciando Backend y Base de Datos Local...
start cmd /k "cd backend && npm install && npx prisma generate && npx prisma db push && npm run dev"

echo Iniciando Frontend (Capstone Skills)...
start cmd /k "cd capstone-skills && bun install && bun run dev"

echo Proyecto iniciado exitosamente para la presentacion!
