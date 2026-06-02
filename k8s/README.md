# Kubernetes Deployment — Packet Quest Arena

This folder lets you run the whole game on **Kubernetes** instead of Docker
Compose. If Docker Compose is "run my containers on my laptop," Kubernetes (k8s)
is "run my containers on a cluster that keeps them alive, restarts them if they
crash, and can scale them up under load." Same containers — smarter manager.

Everything here is plain YAML. You don't write code; you *describe* what you want
("I want 2 copies of the backend, each with a health check") and Kubernetes makes
reality match that description.

> New to Kubernetes? Read the **Big picture** and **Glossary** below first — then
> the commands will make sense. If you just want it running, jump to
> **Quick start**.

---

## Big picture — what gets deployed

Four little programs ("pods") run inside the cluster and talk to each other:

```
   Your browser
        │  http://localhost:3000  (via port-forward)
        ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ frontend │────▶│ backend  │────▶│  mysql   │
   │ (nginx)  │ api │ (Spring) │ sql │  (DB)    │
   └──────────┘     └──────────┘     └──────────┘
                          ▲
                          │ posts incidents (optional)
                    ┌───────────┐
                    │ simulator │
                    │ (Python)  │
                    └───────────┘
```

- **frontend** — the React game, served by nginx. Your browser talks to this.
- **backend** — the Spring Boot game engine and API. Runs **2 copies** for scaling.
- **mysql** — the database for sessions, scores, and audit records.
- **simulator** — Python chaos generator. Optional (the backend makes its own
  incidents too).

The browser only ever talks to the **frontend**; nginx quietly forwards `/api`
and `/ws` to the backend inside the cluster, so there are no CORS headaches.

---

## Glossary — the Kubernetes words you'll see

| Word | Plain-English meaning |
|------|-----------------------|
| **Pod** | The smallest unit — basically "one running container." |
| **Deployment** | A rule that says "keep N copies of this pod running." If one dies, it makes a new one. |
| **Service** | A stable internal address + load balancer for a set of pods. Pods come and go; the Service name (e.g. `backend`) stays. |
| **Namespace** | A folder for grouping resources. Ours is `packetquest`, so we don't mix with other apps. |
| **ConfigMap** | Non-secret settings (DB URL, usernames) injected as environment variables. |
| **Secret** | Like a ConfigMap but for passwords. Base64-encoded, kept out of git. |
| **Probe** | A health check. *Readiness* = "ready for traffic?"; *Liveness* = "still alive or should I restart it?" |
| **HPA** (HorizontalPodAutoscaler) | Auto-adds/removes backend copies based on CPU load (here: 2→5 copies at 70% CPU). |
| **`kubectl`** | The command-line tool you use to talk to the cluster. |

---

## What's in this folder

| File | What it defines |
|------|-----------------|
| `namespace.yaml` | The `packetquest` namespace (apply this first) |
| `configmap.yaml` | Non-secret backend config (DB URL/user, `BACKEND_URL`) |
| `secret.yaml` | **Placeholder** secret template — real passwords are NOT committed |
| `mysql-deployment.yaml` | MySQL Deployment + Service (storage is `emptyDir` — see note) |
| `backend-deployment.yaml` | Backend Deployment + Service + **HPA** (CPU 70%, 2→5 copies) |
| `frontend-deployment.yaml` | Frontend Deployment + Service |
| `simulator-deployment.yaml` | Simulator Deployment (optional incident generator) |

Each app's **Service** (and the backend's **HPA**) lives in the *same* file as its
Deployment, separated by `---` lines — that's just YAML's way of putting several
documents in one file.

---

## Before you start (prerequisites)

1. **Docker Desktop** installed, with **Kubernetes enabled**
   (Settings → Kubernetes → "Enable Kubernetes"). This is the setup we used and
   validated — no Minikube needed.
2. **`kubectl`** available (Docker Desktop installs it). Check the cluster is up:
   ```bash
   kubectl get nodes        # should list a node that is "Ready"
   ```
3. Run all commands from this `k8s/` folder unless noted otherwise.

---

## Quick start (TL;DR)

If you just want it running on Docker Desktop, this is the whole thing:

```bash
# 1. Build the three images (from the repo root, one level up)
docker build -t packetquest/backend:latest   ../backend
docker build -t packetquest/frontend:latest  ../frontend
docker build -t packetquest/simulator:latest ../simulator

# 2. Create the namespace + config
kubectl apply -f namespace.yaml
kubectl apply -n packetquest -f configmap.yaml

# 3. Create the secret (passwords — not committed to git)
kubectl create secret generic packetquest-secrets -n packetquest \
  --from-literal=SPRING_DATASOURCE_PASSWORD=pqpassword \
  --from-literal=MYSQL_PASSWORD=pqpassword \
  --from-literal=MYSQL_ROOT_PASSWORD=rootpassword

# 4. Deploy everything else
kubectl apply -n packetquest -f mysql-deployment.yaml
kubectl apply -n packetquest -f backend-deployment.yaml
kubectl apply -n packetquest -f frontend-deployment.yaml
kubectl apply -n packetquest -f simulator-deployment.yaml

# 5. Wait until all pods are READY 1/1, then open the game
kubectl get pods -n packetquest -w        # Ctrl+C when all show 1/1
kubectl port-forward -n packetquest svc/frontend 3000:80
# open http://localhost:3000
```

The rest of this README explains each of those steps in detail.

---

## Step 1 — Build the images

The Deployments expect images named:

- `packetquest/backend:latest`
- `packetquest/frontend:latest`
- `packetquest/simulator:latest`

You have to build these first. **Why these exact names?** Because the YAML files
say `image: packetquest/backend:latest`, etc. The Deployments also set
`imagePullPolicy: IfNotPresent`, which means *"use the image I built locally;
don't go download it from the internet."*

**Docker Desktop (the path we validated):** a plain build is enough — Docker
Desktop's Kubernetes can see images built on your machine.

```bash
# from the repo root
docker build -t packetquest/backend:latest   ./backend
docker build -t packetquest/frontend:latest  ./frontend
docker build -t packetquest/simulator:latest ./simulator
```

**Minikube:** Minikube has its *own* Docker, so point your terminal at it first,
then build:

```bash
eval $(minikube docker-env)
docker build -t packetquest/backend:latest ./backend   # ...and frontend, simulator
```

**kind:** build on your machine, then load each image into the kind cluster:

```bash
kind load docker-image packetquest/backend:latest       # ...and frontend, simulator
```

(For a real remote cluster, push these to a container registry and update the
`image:` fields to point at it.)

---

## Step 2 — Create the namespace and config

The namespace is a folder for our resources; the ConfigMap is the non-secret
settings (which database to use, etc.).

```bash
kubectl apply -f namespace.yaml
kubectl apply -n packetquest -f configmap.yaml
```

`-n packetquest` means "put this in the packetquest namespace."

---

## Step 3 — Create the secret (passwords)

`secret.yaml` in this folder is a **template with fake placeholder values** — we
never commit real passwords to git (it's a security requirement of the project).
So instead of editing that file, create the real secret directly with a command:

```bash
kubectl create secret generic packetquest-secrets -n packetquest \
  --from-literal=SPRING_DATASOURCE_PASSWORD=pqpassword \
  --from-literal=MYSQL_PASSWORD=pqpassword \
  --from-literal=MYSQL_ROOT_PASSWORD=rootpassword
```

These match the defaults in `docker-compose.yml`. For anything shared, use
stronger passwords. To make this re-runnable without errors, append
`--dry-run=client -o yaml | kubectl apply -f -`.

*(Alternative: fill the `<base64-...>` blanks in `secret.yaml` yourself with
`echo -n 'pqpassword' | base64`, then `kubectl apply` it — but do **not** commit
the filled-in file.)*

---

## Step 4 — Deploy the apps

Order matters a little: MySQL first, then the backend (which needs the DB), then
frontend and simulator.

```bash
kubectl apply -n packetquest -f mysql-deployment.yaml
kubectl apply -n packetquest -f backend-deployment.yaml
kubectl apply -n packetquest -f frontend-deployment.yaml
kubectl apply -n packetquest -f simulator-deployment.yaml

# Shortcut once the namespace exists — apply every file in the folder:
# kubectl apply -n packetquest -f .
```

---

## Step 5 — Watch it come up

```bash
kubectl get pods -n packetquest -w     # live view; press Ctrl+C to stop watching
```

You want every pod to reach **`READY 1/1`** with status **`Running`**. This takes
a minute or two on a fresh deploy.

**Don't panic if the backend restarts once or twice at the start.** The backend
pods boot faster than MySQL, fail to connect, crash, and Kubernetes restarts them
automatically until the database is ready — you'll briefly see `Error` or
`CrashLoopBackOff`, then `Running`. That's expected and self-heals in ~90s.

Other handy checks:

```bash
kubectl get svc -n packetquest                       # the internal addresses
kubectl get hpa -n packetquest                       # autoscaler status + CPU%
kubectl describe pod -n packetquest -l app=backend   # detailed events / probe info
kubectl logs -n packetquest -l app=backend --tail=50 # backend logs
```

---

## Step 6 — Play the game

Kubernetes keeps the apps *inside* the cluster. To reach the frontend from your
browser, "port-forward" it to a local port:

```bash
kubectl port-forward -n packetquest svc/frontend 3000:80
```

Now open **http://localhost:3000**. Open a second browser tab to join as a second
player. (Leave that `port-forward` command running while you play; Ctrl+C stops it.)

> Why not just use the LoadBalancer? The frontend Service is `type: LoadBalancer`,
> which on a real cloud gives you a public IP. On Docker Desktop it shows
> `EXTERNAL-IP: <pending>`, so **`port-forward` is the reliable way locally.**

Optional — talk to the backend API directly (e.g. for testing):

```bash
kubectl port-forward -n packetquest svc/backend 8080:8080
```

---

## Step 7 — The simulator is optional

The simulator posts incidents to a specific game session. Without a `SESSION_ID`
it just prints in "demo mode." The backend already generates its own
weather/incidents, so you can turn the simulator off to save resources:

```bash
kubectl scale deploy/simulator -n packetquest --replicas=0
```

---

## Step 8 — Clean up (delete everything)

```bash
kubectl delete namespace packetquest    # removes all the pods/services in one go
```

---

## Validation status

These manifests were **deployed and verified end-to-end on Docker Desktop
Kubernetes** (k8s v1.34, containerd). Confirmed working:

- All pods reached `Running` / `READY 1/1`: `mysql`, `backend` (2 copies),
  `frontend`, `simulator`.
- The autoscaler (`backend-hpa`) read CPU from metrics-server
  (e.g. `cpu: 2%/70%`, 2→5 copies) — i.e. it works, not stuck at `<unknown>`.
- Through `kubectl port-forward svc/frontend`, the UI loaded (HTTP 200,
  `<title>Packet Quest Arena</title>`) and `POST /api/sessions` returned
  `HTTP 201` with a real session — proving the full path
  **frontend (nginx) → `backend` Service → backend pod → MySQL**.

---

## Notes & limitations (good to know / good to mention in a demo)

- **Database storage is ephemeral.** MySQL uses `emptyDir`, so its data is wiped
  if the pod restarts. That's fine for a demo. For real persistence you'd switch
  MySQL to a **StatefulSet with a PersistentVolumeClaim (PVC)**.
- **The HPA needs metrics-server** to read CPU. Docker Desktop includes it; on
  Minikube run `minikube addons enable metrics-server`. Without it the autoscaler
  shows `<unknown>/70%`.
- **No real secrets are committed.** `secret.yaml` holds placeholders only; the
  real secret is created at deploy time (Step 3).
- **The frontend reaches the backend via the in-cluster `backend` Service.** If
  you ever serve the frontend from somewhere else, update `BACKEND_URL`.