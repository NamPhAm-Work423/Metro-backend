Grafana provisioning for Metro

Contents:
- grafana/provisioning/datasources/prometheus.yml → auto-add Prometheus data source
- grafana/provisioning/dashboards/dashboards.yml → auto-load dashboards from /var/lib/grafana/dashboards
- grafana/dashboards/metro-overview.json → starter dashboard

Usage:
1) docker compose up -d grafana (after compose has the volumes mounted)
2) Open http://localhost:3001 → the "Metro Overview" dashboard will be available

