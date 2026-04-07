output "droplet_id" {
  description = "DigitalOcean droplet ID."
  value       = digitalocean_droplet.app.id
}

output "droplet_ipv4" {
  description = "Public IPv4 — point your DNS A record here when you are ready."
  value       = digitalocean_droplet.app.ipv4_address
}

output "droplet_ipv6" {
  description = "Public IPv6 — optional AAAA record."
  value       = digitalocean_droplet.app.ipv6_address
}

output "ssh_root_hint" {
  description = "First login before Ansible (root has key from DO)."
  value       = "ssh -o StrictHostKeyChecking=accept-new root@${digitalocean_droplet.app.ipv4_address}"
}
