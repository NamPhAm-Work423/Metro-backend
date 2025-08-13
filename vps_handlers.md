#!/bin/bash

echo "🧹 STARTING VPS COMPLETE CLEANUP"
echo "=================================="

# 1. DOCKER CLEANUP
echo "🐳 Cleaning Docker..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm -f $(docker ps -aq) 2>/dev/null || true
docker volume prune -f
docker network prune -f
docker image prune -af
docker builder prune -af
docker system prune -af --volumes //delete all 

# 2. DOCKER COMPOSE CLEANUP
echo "🔧 Cleaning Docker Compose..."
find /opt -name "docker-compose*.yml" -exec dirname {} \; | xargs -I {} bash -c 'cd {} && docker-compose down --volumes --remove-orphans 2>/dev/null || true'

# 3. LOG FILES CLEANUP
echo "📝 Cleaning log files..."
sudo find /var/log -type f -name "*.log" -size +100M -delete
sudo find /var/log -type f -name "*.log.*" -mtime +7 -delete
sudo journalctl --vacuum-size=100M
sudo journalctl --vacuum-time=7d

# 4. PACKAGE MANAGER CLEANUP
echo "📦 Cleaning package cache..."
sudo apt-get autoremove -y
sudo apt-get autoclean
sudo apt-get clean
sudo snap refresh --list 2>/dev/null | tail -n +2 | awk '{print $1}' | xargs -I {} sudo snap refresh {} || true

# 5. TEMPORARY FILES
echo "🗑️ Cleaning temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*
sudo rm -rf /var/cache/apt/archives/*.deb
sudo rm -rf ~/.cache/*

# 6. OLD KERNELS (cẩn thận!)
echo "🔄 Cleaning old kernels..."
sudo apt-get autoremove --purge -y

# 7. SWAP FILE RESET (nếu cần)
echo "💾 Managing swap..."
sudo swapoff -a
sudo swapon -a

# 8. SYSTEMD SERVICES CLEANUP
echo "⚙️ Cleaning failed systemd services..."
sudo systemctl reset-failed

# 9. USER CLEANUP
echo "👤 Cleaning user files..."
rm -rf ~/.bash_history
rm -rf ~/.lesshst
rm -rf ~/.viminfo
rm -rf ~/.*_history

# 10. NETWORK CLEANUP
echo "🌐 Resetting network..."
sudo netplan apply 2>/dev/null || true
sudo systemctl restart networking 2>/dev/null || true

# 11. DATABASE CLEANUP (nếu có)
echo "🗄️ Database cleanup..."
# Postgres
sudo -u postgres psql -c "VACUUM FULL;" 2>/dev/null || true
# MySQL
mysql -e "FLUSH LOGS;" 2>/dev/null || true

# 12. NODEJS/NPM CLEANUP (nếu có)
echo "📦 Node.js cleanup..."
npm cache clean --force 2>/dev/null || true
yarn cache clean 2>/dev/null || true

# 13. PYTHON CLEANUP
echo "🐍 Python cleanup..."
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# 14. DISK SPACE CHECK
echo "💽 Checking disk space..."
echo "BEFORE cleanup:"
df -h /

# 15. MEMORY CLEANUP
echo "🧠 Clearing caches..."
sudo sync
echo 1 | sudo tee /proc/sys/vm/drop_caches
echo 2 | sudo tee /proc/sys/vm/drop_caches  
echo 3 | sudo tee /proc/sys/vm/drop_caches

# 16. RESTART ESSENTIAL SERVICES
echo "🔄 Restarting services..."
sudo systemctl restart docker 2>/dev/null || true
sudo systemctl restart ssh
sudo systemctl restart systemd-resolved

echo ""
echo "AFTER cleanup:"
df -h /

echo ""
echo "✅ VPS CLEANUP COMPLETED!"
echo "========================="
echo "📊 Final system status:"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h
echo ""
echo "Docker status:"
docker system df 2>/dev/null || echo "Docker not running"

echo ""
echo "🚨 RECOMMENDED: Reboot VPS for complete cleanup"
echo "sudo reboot"