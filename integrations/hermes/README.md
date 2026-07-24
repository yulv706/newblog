# Hermes integration

This directory contains the audited MCP bridge and operating skill used by Hermes Agent.

Server layout:

```text
/opt/hermes/data/
  .env
  config.yaml
  integrations/blog_manager_mcp.py
  skills/blog-manager/SKILL.md
```

The Hermes service stays on `hermes_default` and also joins the external `newblog_default` Docker network. No host port is added. The bridge reaches `http://blog-app:3000` by Docker DNS and cannot reach the API through public Nginx.

Validate after deployment:

```bash
docker exec hermes-agent hermes mcp list
docker exec hermes-agent python /opt/data/integrations/blog_manager_mcp.py --help
docker exec hermes-agent getent hosts blog-app
```

Use the Hermes MCP inspector or a normal Weixin request to run `blog_status`, list
users, then create and delete a temporary draft to verify the complete mutation
path. Role and status changes require explicit confirmation in the typed bridge.
