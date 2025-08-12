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


Hướng dẫn CD (GitHub Actions)
--------------------------------

1) Tạo secret KUBE_CONFIG (bắt buộc)
- Giá trị là kubeconfig đã mã hóa base64.
- Linux/macOS:
  - `base64 -w 0 ~/.kube/config`
  - Nếu máy không hỗ trợ `-w`: `base64 ~/.kube/config | tr -d "\n"`
- Windows PowerShell:
  - `[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\.kube\config"))`
- Vào GitHub → Settings → Secrets and variables → Actions → New repository secret
  - Name: `KUBE_CONFIG`
  - Value: kết quả base64 ở trên

2) Tùy chọn: Namespace và chart path
- Workflow mặc định: `NAMESPACE=metro`, `CHART_PATH=deploy/helm/metro`.
- Bạn có thể sửa trực tiếp trong `.github/workflows/cd.yml` nếu cần.

3) Cách kích hoạt CD
- Tự động khi push vào `main`, khi push tag `v*`, hoặc khi publish release.
- Thủ công: Actions → `CD` → Run workflow → nhập `version` (vd: `v1.2.3`).
  - Nếu chạy từ push vào nhánh, workflow sẽ tự lấy short SHA làm tag.

4) Cách workflow dùng KUBE_CONFIG
- Bước `Export kubeconfig secret to env` sẽ nạp `KUBE_CONFIG` vào biến môi trường.
- Action tổng hợp `.github/actions/kubeconfig` sẽ decode và ghi ra `$HOME/.kube/config`.
- Nếu `KUBE_CONFIG` trống, workflow sẽ bỏ qua các bước deploy (kubectl/helm apply) nhưng vẫn lint chart.

5) Kiểm tra nhanh
- Actions log phải có `kubeconfig written from env` nếu secret hợp lệ.
- Nếu thấy `KUBE_CONFIG is empty; skipping kubeconfig setup.`, hãy kiểm tra lại secret.


0