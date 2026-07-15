# cicd-test

Demo pipeline CI/CD đầy đủ cho 1 app **Todolist dạng microservice**: **CI = GitHub Actions**, **CD = ArgoCD**, chạy trên cluster **kind** local.

## Kiến trúc

```
services/
  db/         Postgres 16 + init.sql (bảng todos)
  backend/    Node.js/Express API (CRUD /todos, /healthz)
  frontend/   HTML/JS thuần, phục vụ bởi nginx (proxy /api/ → backend)
manifests/    Kubernetes manifests (Deployment/Service/PVC/Secret mỗi service), quản lý bằng Kustomize
argocd/       ArgoCD Application trỏ vào manifests/
.github/      GitHub Actions workflow CI/CD
docker-compose.yaml   chạy thử cả stack local không cần K8s
```

Frontend gọi `fetch('/api/todos')` — nginx trong container frontend proxy `/api/` sang Service `backend:3001`, nên không cần cấu hình CORS.

## Luồng CI/CD

1. Push code vào `services/**` trên nhánh `main`.
2. GitHub Actions chạy lần lượt các job:
   - `lint-format-test`: ESLint → Prettier `--check` → unit test (chỉ áp dụng cho `services/backend`).
   - `secret-scan`: Trivy quét secret trong toàn bộ `services/` (chặn pipeline nếu phát hiện).
   - `sast`: CodeQL phân tích tĩnh mã JavaScript.
   - `build-scan-push` (chạy sau khi 3 job trên pass): build lần lượt 3 image (`db`, `backend`, `frontend`) → Trivy quét lỗ hổng từng image (báo cáo, không chặn) → sinh SBOM (CycloneDX, upload artifact) → push cả 3 image lên ghcr.io (`cicd-test-db`, `cicd-test-backend`, `cicd-test-frontend`).
3. Job `build-scan-push` tự cập nhật tag cả 3 image trong `manifests/kustomization.yaml` và commit lại vào `main`.
4. ArgoCD theo dõi repo (path `manifests/`), tự động phát hiện commit mới và sync (`automated: prune + selfHeal`) vào namespace `todolist`.

Kết quả secret-scan/SAST/vulnerability-scan hiển thị ở tab **Security → Code scanning alerts** của repo (yêu cầu repo public hoặc GitHub Advanced Security). SBOM tải ở tab **Actions → artifact `sbom-<sha>`** của mỗi run.

## Chạy thử local không cần K8s

```bash
docker compose up --build
```
Mở http://localhost:8080

## Setup cluster local (kind)

```bash
kind create cluster --name argocd-test

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml --server-side --force-conflicts
kubectl wait --for=condition=available --timeout=300s deployment --all -n argocd

kubectl apply -f argocd/application.yaml
```

## Truy cập ArgoCD UI

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```
Mở https://localhost:8080, username `admin`, lấy password:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Truy cập UI của app

```bash
kubectl port-forward svc/frontend -n todolist 8081:80
```
Mở http://localhost:8081

## Lưu ý

- Package image trên ghcr.io (cả 3: `cicd-test-db`, `cicd-test-backend`, `cicd-test-frontend`) cần để **Public** (hoặc cấu hình `imagePullSecrets`) để kind pull được image.
- Vì CI tự commit vào `main`, luôn `git fetch && git rebase origin/main` (hoặc `git config pull.rebase true`) trước khi push commit tiếp theo để tránh bị reject do diverge.
- `manifests/db-secret.yaml` chứa mật khẩu Postgres **chỉ để demo trên cluster kind local**, đã commit thẳng vào Git (repo Public nên coi như đã công khai). Không dùng lại mật khẩu này cho môi trường thật; cho production nên dùng Sealed Secrets/External Secrets/SOPS thay vì commit Secret trực tiếp.
- Vì đổi tên Application ArgoCD từ `sample-app` sang `todolist`, cần xóa Application cũ trên cluster trước khi apply lại: `kubectl delete application sample-app -n argocd` (nếu cluster đã từng cài bản cũ).
