# Network flow: Docker → kind → Kubernetes

## Hiện trạng: chỉ port 6443 được Docker publish ra host

```mermaid
graph TB
    subgraph mac["Mac host"]
        user["Bạn (browser / curl)"]
        kubectl["kubectl port-forward<br/>(chạy local, giữ terminal)"]
    end

    subgraph docker["Docker container: argocd-test-control-plane"]
        subgraph published["Cổng ĐÃ publish ra host"]
            api["kube-apiserver :6443"]
        end
        kubelet["kubelet"]
        subgraph clusterNet["Cluster network (Mac KHÔNG route trực tiếp vào được)"]
            svc["Service sample-app<br/>ClusterIP :80"]
            pod["Pod sample-app<br/>:3000"]
        end
    end

    user -- "localhost:8081" --> kubectl
    kubectl -- "1. gọi API portforward<br/>qua cổng 6443 (published)" --> api
    api -- "2. yêu cầu tunnel" --> kubelet
    kubelet -- "3. stream trực tiếp vào Pod<br/>(SPDY/websocket, KHÔNG qua Service)" --> pod
    svc -. "route nội bộ cluster<br/>(chỉ Pod-to-Pod dùng được)" .-> pod

    style published fill:#16a34a,color:#fff
    style clusterNet fill:#334155,color:#fff
```

**Điểm mấu chốt:** port-forward không đi qua Docker port-mapping của Service. Nó tunnel qua đúng 1 cổng đã published (6443) bằng cách nhờ kube-apiserver + kubelet chuyển tiếp stream thẳng vào Pod. Vì vậy nó "xuyên" được vào cluster dù chỉ có 1 cổng lộ ra ngoài — nhưng tunnel này sống theo tiến trình `kubectl`, tắt là mất.

## Muốn NodePort thật (không cần giữ terminal): phải publish port lúc TẠO container

```mermaid
graph TB
    subgraph mac2["Mac host"]
        user2["Bạn (browser / curl)<br/>localhost:30080"]
    end

    subgraph docker2["Docker container: kind node (tạo lại với extraPortMappings)"]
        subgraph published2["Cổng publish lúc kind create cluster"]
            nodeport["hostPort 30080 → containerPort 30080"]
        end
        subgraph clusterNet2["Cluster network"]
            svc2["Service sample-app<br/>type: NodePort, nodePort: 30080"]
            pod2["Pod sample-app<br/>:3000"]
        end
    end

    user2 -- "kết nối trực tiếp,<br/>không cần kubectl chạy nền" --> nodeport
    nodeport --> svc2
    svc2 --> pod2

    style published2 fill:#16a34a,color:#fff
    style clusterNet2 fill:#334155,color:#fff
```

**Khác biệt cốt lõi:** Docker chỉ cho publish port **lúc container được tạo** (`docker run -p` / kind's `extraPortMappings`), không thể thêm port-mapping vào container đang chạy. Vì cluster kind hiện tại được tạo mà không khai báo `extraPortMappings`, nên phải `kind delete cluster` + tạo lại với config mới để dùng NodePort mà không cần port-forward.
