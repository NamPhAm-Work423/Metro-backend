Metro Helm Chart

Triển khai mỗi service bằng cùng một chart, truyền `values/<service>.yaml` và set `image.tag` cụ thể (không dùng latest).

Ví dụ lệnh cục bộ:

```
NAMESPACE=metro
helm upgrade --install auth-service deploy/helm/metro \
  --namespace $NAMESPACE \
  --create-namespace \
  --values deploy/helm/metro/values/auth-service.yaml \
  --set name=auth-service \
  --set image.repository=ghcr.io/<org>/metro-auth-service \
  --set image.tag=v1.0.0
```

Các giá trị bắt buộc:
- name: tên service
- image.repository: repo image đầy đủ
- image.tag: thẻ cụ thể (SHA/semver)


0