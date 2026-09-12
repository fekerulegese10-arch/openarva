# Security Policy

## Supported Versions

Security fixes are applied to the latest published OpenArva version. Older versions may not receive security updates.

## Reporting a Vulnerability

Do not disclose security vulnerabilities in public issues. Report them privately through the repository security advisory workflow or contact the maintainers through the official project channels listed in `README.md`.

Include:

- affected version and operating system
- reproducible steps or a minimal proof of concept
- impact and likely attack path
- logs with secrets and personal data removed

Please allow maintainers reasonable time to investigate and release a fix before public disclosure. Do not include API keys, bot tokens, passwords, private chat exports, or other credentials in a report.

## Security Expectations

OpenArva executes local commands only through its allowlisted, approval-gated sandbox. Operators should still run it with the least filesystem and network privileges required, keep tokens outside source control, protect `~/.openarva`, and review connector webhook authentication before exposing a gateway beyond localhost.
