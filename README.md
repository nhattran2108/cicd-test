# cicd-test

Demo pipeline CI/CD đầy đủ: **CI = GitHub Actions**, **CD = ArgoCD**, chạy trên cluster **kind** local.

## Kiến trúc

```
app/          Node.js/Express app (UI + /healthz)
manifests/    Kubernetes manifests, quản lý bằng Kustomize
argocd/       ArgoCD Application trỏ vào manifests/
.github/      GitHub Actions workflow CI/CD
```

## Luồng CI/CD

1. Push code vào `app/**` trên nhánh `main`.
2. GitHub Actions chạy lần lượt các job:
   - `lint-format-test`: ESLint → Prettier `--check` → unit test.
   - `secret-scan`: Trivy quét secret trong source (chặn pipeline nếu phát hiện).
   - `sast`: CodeQL phân tích tĩnh mã JavaScript.
   - `build-scan-push` (chạy sau khi 3 job trên pass): build Docker image → Trivy quét lỗ hổng image (báo cáo, không chặn) → sinh SBOM (CycloneDX, upload artifact) → push image lên `ghcr.io/nhattran2108/cicd-test`.
3. Job `build-scan-push` tự cập nhật tag image trong `manifests/kustomization.yaml` và commit lại vào `main`.
4. ArgoCD theo dõi repo (path `manifests/`), tự động phát hiện commit mới và sync (`automated: prune + selfHeal`) vào namespace `sample-app`.

Kết quả secret-scan/SAST/vulnerability-scan hiển thị ở tab **Security → Code scanning alerts** của repo (yêu cầu repo public hoặc GitHub Advanced Security). SBOM tải ở tab **Actions → artifact `sbom-<sha>`** của mỗi run.

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
kubectl port-forward svc/sample-app -n sample-app 8081:80
```
Mở http://localhost:8081

## Lưu ý

- Package image trên ghcr.io cần để **Public** (hoặc cấu hình `imagePullSecrets`) để kind pull được image.
- Vì CI tự commit vào `main`, luôn `git fetch && git rebase origin/main` trước khi push commit tiếp theo để tránh bị reject do diverge.
