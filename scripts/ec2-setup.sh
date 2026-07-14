#!/bin/bash
# Script de setup inicial para EC2 Amazon Linux 2023 (t2.micro)
# Ejecutar UNA SOLA VEZ después de crear la instancia:
#   chmod +x ec2-setup.sh && ./ec2-setup.sh

set -e

echo "=== 1. Actualizar sistema ==="
sudo dnf update -y

echo "=== 2. Instalar Docker ==="
sudo dnf install -y docker git curl
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

echo "=== 3. Instalar Docker Compose ==="
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

echo "=== 4. Crear swap (2GB — evitar OOM en t2.micro) ==="
if [ ! -f /swapfile ]; then
  sudo dd if=/dev/zero of=/swapfile bs=128M count=16
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
  echo "Swap creado: 2GB"
else
  echo "Swap ya existe, omitiendo"
fi

echo "=== 5. Crear directorio del proyecto ==="
mkdir -p ~/fichamedica/nginx

echo "=== 6. Instalar Certbot (Let's Encrypt SSL) ==="
sudo dnf install -y python3-certbot-nginx || \
  sudo dnf install -y certbot python3-certbot-nginx || \
  (sudo pip3 install certbot certbot-nginx && echo "Certbot instalado via pip")

echo ""
echo "======================================================"
echo "✅ Setup completado. Próximos pasos manuales:"
echo ""
echo "1. Configurar Security Group en AWS:"
echo "   - Puerto 22  (SSH)    → tu IP"
echo "   - Puerto 80  (HTTP)   → 0.0.0.0/0"
echo "   - Puerto 443 (HTTPS)  → 0.0.0.0/0"
echo ""
echo "2. Apuntar tu dominio a la IP de esta instancia"
echo "   (Esperar propagación DNS antes del siguiente paso)"
echo ""
echo "3. Obtener certificado SSL:"
echo "   sudo certbot certonly --standalone -d tudominio.com"
echo "   (Detener nginx si está corriendo primero)"
echo ""
echo "4. Renovación automática SSL (agregar al cron):"
echo "   echo '0 3 * * * certbot renew --quiet' | sudo crontab -"
echo ""
echo "5. Configurar GitHub Secrets en tu repo:"
echo "   EC2_HOST            → $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'IP_DEL_EC2')"
echo "   EC2_USER            → ec2-user"
echo "   EC2_SSH_KEY         → contenido del archivo .pem"
echo "   DATABASE_URL        → postgresql+asyncpg://user:pass@HOST_RDS:5432/fichamedica"
echo "   SECRET_KEY          → $(python3 -c 'import secrets; print(secrets.token_hex(32))')"
echo "   DOMAIN              → tudominio.com"
echo "   NEXT_PUBLIC_API_URL → https://tudominio.com/api/v1"
echo "   SUPERADMIN_EMAIL    → admin@tudominio.com"
echo "   SUPERADMIN_PASSWORD → (contraseña segura)"
echo "======================================================"
