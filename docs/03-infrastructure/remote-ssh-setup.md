# 🔗 Remote SSH Development Setup

## Problem

> Developing on a Windows machine while the production runtime is on a Linux server causes **environment inconsistency**, slow feedback loops due to manual file syncing, and difficult remote debugging.

## Solution

Use **VS Code Remote-SSH** to develop directly on the Toshiba server from your Windows machine. Your code, terminal, and extensions all run on the server — VS Code on Windows acts only as a display layer.

---

## Architecture

```
┌───────────────────────────┐        SSH (Port 22)        ┌───────────────────────────┐
│    Windows Machine        │ ◄══════════════════════════► │    Toshiba Server         │
│                           │                              │    (Linux Mint)           │
│  ┌─────────────────────┐  │                              │  ┌─────────────────────┐  │
│  │  VS Code UI          │  │      Display Only           │  │  VS Code Server     │  │
│  │  • Editor window     │◄─┼──────────────────────────── │  │  • File operations  │  │
│  │  • File explorer     │  │                              │  │  • IntelliSense     │  │
│  │  • Terminal display   │  │      Commands & Keystrokes  │  │  • Extensions       │  │
│  │                      │──┼────────────────────────────►│  │  • Terminal (bash)  │  │
│  └─────────────────────┘  │                              │  └─────────────────────┘  │
│                           │                              │                           │
│  Keyboard + Mouse only    │                              │  All code + runtime here  │
└───────────────────────────┘                              └───────────────────────────┘
```

---

## Setup Guide

### Step 1: Enable SSH on Toshiba Server

Run these commands **on the Toshiba server**:

```bash
# Install OpenSSH server
sudo apt install openssh-server -y

# Enable and start the service
sudo systemctl enable ssh
sudo systemctl start ssh

# Verify it's running
sudo systemctl status ssh
# Expected: "active (running)"

# Get the server's local IP address
hostname -I
# Example output: 192.168.1.105
# ↑ Save this IP — you'll need it below
```

### Step 2: Install Remote-SSH Extension on Windows

1. Open **VS Code** on your Windows machine
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for **"Remote - SSH"** (publisher: Microsoft)
4. Click **Install**

### Step 3: Configure SSH Connection

1. Press `Ctrl+Shift+P` → type **"Remote-SSH: Open SSH Configuration File"**
2. Select `C:\Users\<YourName>\.ssh\config`
3. Add this entry:

```
Host toshiba-server
    HostName 192.168.1.105
    User your-linux-username
    Port 22
```

> Replace `192.168.1.105` with your server's actual IP  
> Replace `your-linux-username` with your Linux account name

### Step 4: Connect to the Server

1. Press `Ctrl+Shift+P` → **"Remote-SSH: Connect to Host"**
2. Select **toshiba-server**
3. Enter your Linux password when prompted
4. Wait for VS Code to install its server component (first time only, ~1 minute)
5. Once connected, the bottom-left corner shows: `SSH: toshiba-server` ✅

### Step 5: Open the Project

1. **File → Open Folder**
2. Navigate to `/home/<username>/SharifCloud-Sync`
3. Click **OK**
4. You're now editing files **directly on the server!**

---

## (Recommended) SSH Key Authentication

Avoid typing your password every time by setting up key-based auth.

### On Windows (PowerShell):

```powershell
# Generate an SSH key pair (press Enter for all prompts)
ssh-keygen -t ed25519

# Copy the public key to the server
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh your-linux-username@192.168.1.105 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

After this, connecting via Remote-SSH will be instant — no password needed.

---

## Daily Workflow

```
1. Open VS Code on Windows
2. Ctrl+Shift+P → "Remote-SSH: Connect to Host" → toshiba-server
3. Open folder: ~/SharifCloud-Sync
4. Write code in the editor (files are ON the server)
5. Open terminal (Ctrl+`) → runs bash ON the server
6. Run: cd backend && npm run dev
7. Test API: curl http://localhost:3000/api/health
8. All changes are saved directly on the server — no sync needed!
```

---

## Recommended Extensions (Install on Server)

When connected via Remote-SSH, install these extensions **on the server side**:

| Extension | Purpose |
|-----------|---------|
| ESLint | JavaScript linting |
| Prettier | Code formatting |
| Thunder Client | API testing (alternative to Postman) |
| PostgreSQL | Database management |
| GitLens | Enhanced Git integration |

> When VS Code asks "Install on SSH: toshiba-server?", click **Yes**.

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Connection refused | Verify SSH is running: `sudo systemctl status ssh` |
| Permission denied | Check username and password; verify `authorized_keys` permissions |
| Server IP changed | Run `hostname -I` on server to find new IP; update `~/.ssh/config` |
| Slow connection | Ensure both devices are on the same network; use Ethernet if possible |
| Extensions not working | Reinstall extensions while connected to the server |

---

> **Next**: [Offline-First Strategy →](../04-features/offline-first.md)
