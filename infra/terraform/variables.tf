variable "do_token" {
  description = "DigitalOcean API token (Personal Access Token with read+write). Set via TF_VAR_do_token or terraform.tfvars — never commit real values."
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region slug (e.g. nyc3, sfo3, fra1)."
  type        = string
  default     = "nyc3"
}

variable "droplet_name" {
  description = "Human-readable droplet name in the DO control panel."
  type        = string
  default     = "atdance-prod"
}

variable "droplet_size" {
  description = "Droplet plan slug (e.g. s-1vcpu-1gb). See https://slugs.do-api.dev/"
  type        = string
  default     = "s-1vcpu-1gb"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH *public* key Terraform uploads to DigitalOcean (same key you will use for Ansible and daily login)."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "management_cidrs" {
  description = "IPv4/IPv6 CIDRs allowed to reach SSH (22) on the cloud firewall. Narrow this to your home IP /32 once stable. 0.0.0.0/0 is convenient but weaker."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "web_cidrs" {
  description = "CIDRs allowed to reach HTTP/HTTPS (80/443). Usually the whole internet."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "enable_icmp" {
  description = "Allow ICMP (ping) to the droplet from management_cidrs — useful for sanity checks; optional."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to the droplet (billing filters, automation)."
  type        = list(string)
  default     = ["atdance", "production"]
}
