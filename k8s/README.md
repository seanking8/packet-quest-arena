# Kubernetes Deployment — Packet Quest Arena

Manifests for running the game on Kubernetes (local: Minikube / kind / Docker
Desktop, or any cluster). All resources live in the `packetquest` namespace.

## Contents

| File | What it defines |
|------|-----------------|
| `namespace.yaml` | `packetquest` namespace |
| `configmap.yaml` | Non-secret backend config (DB URL/user, BACKEND_URL) |
| `secret.yaml` | **Placeholder** secret (base64) — fill in before applying |
| `mysql-deployment.yaml` | MySQL Deployment + Service + PVC |
| `backend-deployment.yaml` | Backend Deployment + Service + **HPA** (CPU 70%, 2→5) |
| `frontend-deployment.yaml` | Frontend Deployment + Service |
| `simulator-deployment.yaml` | Simulator Deployment (optional incident generator) |

Health: the backend Deployment uses Spring Actuator probes
(`/actuator/health/readiness`, `/actuator/health/liveness`). All app
Deployments set CPU/memory requests and limits.

## Image assumptions

The Deployments reference:

- `packetquest/backend:latest`
- `packetquest/frontend:latest`
- `packetquest/simulator:latest`

Build and make them available to the cluster first. For example with Minikube:

```bash
eval $(minikube docker-env)
docker build -t packetquest/backend:latest ./backend
docker build -t packetquest/frontend:latest ./frontend
docker build -t packetquest/simulator:latest ./simulator
```

(For a remote cluster, push these to a registry and update the `image:` fields.)

## 1. Set the secret

Edit `secret.yaml` and replace the `<base64-encoded-...>` placeholders:

```bash
echo -n 'pqpassword' | base64      # -> use for SPRING_DATASOURCE_PASSWORD / MYSQL_PASSWORD
echo -n 'rootpassword' | base64    # -> use for MYSQL_ROOT_PASSWORD
```

## 2. Apply (order matters)

```bash
kubectl apply -f namespace.yaml
kubectl apply -n packetquest -f configmap.yaml
kubectl apply -n packetquest -f secret.yaml
kubectl apply -n packetquest -f mysql-deployment.yaml
kubectl apply -n packetquest -f backend-deployment.yaml
kubectl apply -n packetquest -f frontend-deployment.yaml
kubectl apply -n packetquest -f simulator-deployment.yaml
# or, after the namespace exists, everything at once:
kubectl apply -n packetquest -f .
```

## 3. Check pods and services

```bash
kubectl get pods -n packetquest
kubectl get svc -n packetquest
kubectl get hpa -n packetquest
kubectl describe pod -n packetquest -l app=backend     # probe / event detail
kubectl logs -n packetquest -l app=backend --tail=50
```

Wait until the backend pod is `READY 1/1` (its readiness probe must pass before
the Service sends traffic).

## 4. Port-forward to reach the app locally

```bash
kubectl port-forward -n packetquest svc/frontend 3000:80
kubectl port-forward -n packetquest svc/backend  8080:8080   # optional, direct API
```

Then open http://localhost:3000.

## 5. The simulator (optional)

The simulator posts incidents to a specific session. In-cluster it runs in
print-only mode unless given a `SESSION_ID`. The match itself already generates
weather/incidents server-side, so the simulator is **optional** — scale it to 0
if you don't need it:

```bash
kubectl scale deploy/simulator -n packetquest --replicas=0
```

## 6. Clean up

```bash
kubectl delete namespace packetquest      # removes everything in one shot
```

## Notes / limitations

- HPA needs **metrics-server** in the cluster to read CPU (`minikube addons
  enable metrics-server`). Without it the HPA stays `<unknown>/70%`.
- `secret.yaml` ships with placeholders only — no real credentials are committed.
- The frontend talks to the backend through its in-cluster Service; if you serve
  the frontend elsewhere, set `BACKEND_URL` accordingly.
