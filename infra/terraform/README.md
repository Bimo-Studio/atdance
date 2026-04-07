# Terraform (DigitalOcean)

## Personal access token vs SSH keys

These are **not** interchangeable.

| Secret                                                     | Role                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personal Access Token** (`do_token` / `TF_VAR_do_token`) | Authenticates Terraform to the **DigitalOcean API** so it can create droplets, firewalls, and SSH key records. **Required** for `terraform apply` with the [official provider](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs).                                  |
| **SSH key pair** (public path in `ssh_public_key_path`)    | The **public** key is uploaded to your DO account and embedded in the droplet so you can SSH in as `root` after create. The **private** key stays on your machine for `ssh` and Ansible — Terraform does not use it unless you add provisioners with a `connection` block (this repo does not). |

DigitalOcean’s [Terraform getting started](https://docs.digitalocean.com/reference/terraform/getting-started/#configure-terraform-for-digitalocean) shows **both** `do_token` and SSH key usage: the token drives the API; SSH keys are for machine access.

## Commands

From this directory:

```bash
export TF_VAR_do_token="YOUR_TOKEN"
terraform init
terraform plan
terraform apply
```

Copy `terraform.tfvars.example` to `terraform.tfvars` (gitignored) if you prefer file-based vars.

## Who runs this (not “autopilot”)

Nothing deploys **by itself**. **You** run `terraform plan` / `terraform apply` on a machine you control (or CI you configured). The AI assistant does **not** hold or use your PAT.

**Instance size** is **not** chosen in the DO click UI for this flow — it comes from Terraform: variable `droplet_size` (default `s-1vcpu-1gb` in `variables.tf`, override in `terraform.tfvars`). Change it there, then apply.

## What API surface this stack actually uses

This directory only declares three Terraform resource types:

| Terraform resource      | Maps to DO concept |
| ----------------------- | ------------------ |
| `digitalocean_ssh_key`  | **SSH keys**       |
| `digitalocean_droplet`  | **Droplets**       |
| `digitalocean_firewall` | **Firewalls**      |

It does **not** create App Platform apps, databases, Spaces, Kubernetes, etc. The long list of **43 product areas** on DigitalOcean is the **whole platform** — you only need API access that covers **droplet + firewall + ssh key** (and anything the provider calls implicitly, e.g. listing sizes during plan).

## PAT scopes: least privilege (recommended)

DigitalOcean supports **custom scopes** on personal access tokens ([scopes reference](https://docs.digitalocean.com/reference/api/scopes)). Prefer **Custom Scopes**, **not** “Full Access”, for a Terraform-only token.

A practical minimum for **apply + destroy** with this repo:

- **Droplet:** `read`, `create`, `update`, `delete`
- **Firewall:** `read`, `create`, `update`, `delete`
- **SSH key:** `read`, `create`, `delete` (and `update` if offered — use if `terraform apply` errors on key changes)

If `terraform plan` returns **403** on a metadata call, add narrow **read** scopes the error names (sometimes **account** read or **tag** read/create if you use `tags` on the droplet).

## Risk: full access vs scoped token

| Approach                        | Risk if token leaks                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Full Access** PAT             | Attacker can touch **every** API area your team role allows — droplets, DBs, DNS, billing views, etc. Avoid for day-to-day Terraform.      |
| **Custom scopes** (table above) | Blast radius limited to **those** APIs. Still powerful (anyone with the token can delete droplets or create new ones until you revoke it). |

Also: short **expiration**, **revoke** when done, **never commit** the token, and use a **dedicated token** named e.g. `atdance-terraform` so you can revoke one workflow without nuking everything.

## Avoid accidental `apply` on every push

**This repo’s CI does not run Terraform** — nothing in `.github/workflows/ci.yml` calls `terraform apply`, so a normal **push does not create droplets**.

If you add infrastructure to GitHub Actions later:

- Prefer **`terraform plan` only** on PRs (no credentials that can create resources, or read-only token if you only validate config).
- Run **`terraform apply` only** via **`workflow_dispatch`** (manual button) or an **Environment** with **required reviewers**, not on every `push` to `main`.
- **Never** store `TF_VAR_do_token` in the repo; use **GitHub encrypted secrets** and rotate if leaked.
- The **AI assistant** cannot run Terraform against your account unless **you** paste a token or run commands on your machine — don’t put PATs in chat.
