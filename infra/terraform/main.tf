resource "digitalocean_ssh_key" "deploy" {
  name       = "${var.droplet_name}-terraform"
  public_key = trimspace(file(pathexpand(var.ssh_public_key_path)))
}

resource "digitalocean_droplet" "app" {
  name     = var.droplet_name
  region   = var.region
  size     = var.droplet_size
  image    = "ubuntu-22-04-x64"
  tags     = var.tags
  ssh_keys = [digitalocean_ssh_key.deploy.fingerprint]

  ipv6               = true
  monitoring         = true
  graceful_shutdowns = true
}

resource "digitalocean_firewall" "web" {
  name = "${var.droplet_name}-fw"

  droplet_ids = [digitalocean_droplet.app.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.management_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = var.web_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = var.web_cidrs
  }

  dynamic "inbound_rule" {
    for_each = var.enable_icmp ? [1] : []
    content {
      protocol         = "icmp"
      source_addresses = var.management_cidrs
    }
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
