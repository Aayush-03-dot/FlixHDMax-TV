from extensions import db
from models import Page


def ensure_system_pages():
    defaults = [
        {
            "key": "privacy",
            "title": "Privacy Policy",
            "slug": "privacy",
            "content": """
<h2>Privacy Policy</h2>
<p>This Privacy Policy explains how FlixHD collects, uses, and protects your information.</p>

<h3>Information We Collect</h3>
<ul>
  <li>Account information such as username and email address</li>
  <li>Profile information you choose to upload</li>
  <li>Usage, session, and activity information inside the platform</li>
  <li>Messages or requests sent through contact or request forms</li>
</ul>

<h3>How We Use Information</h3>
<ul>
  <li>To operate and improve the FlixHD platform</li>
  <li>To manage accounts and provide support</li>
  <li>To improve security, moderation, and analytics</li>
</ul>

<h3>Storage and Security</h3>
<p>We take reasonable steps to protect user data, but no system can be guaranteed 100% secure.</p>

<h3>Your Rights</h3>
<p>You may contact us if you want help with your account data or privacy concerns.</p>

<h3>Contact</h3>
<p>If you have questions about this policy, please contact FlixHD support.</p>
""".strip()
        },
        {
            "key": "terms",
            "title": "Terms of Use",
            "slug": "terms",
            "content": """
<h2>Terms of Use</h2>
<p>These Terms of Use govern access to and use of the FlixHD platform.</p>

<h3>Accounts</h3>
<ul>
  <li>You are responsible for maintaining the confidentiality of your account</li>
  <li>You must provide accurate information when creating an account</li>
</ul>

<h3>Acceptable Use</h3>
<ul>
  <li>Do not misuse the service</li>
  <li>Do not attempt unauthorized access</li>
  <li>Do not abuse requests, messaging, or platform features</li>
</ul>

<h3>Availability</h3>
<p>FlixHD may update, suspend, or change parts of the service at any time.</p>

<h3>Termination</h3>
<p>Accounts may be suspended or removed for violations of platform rules.</p>

<h3>Limitation</h3>
<p>Use of the service is at your own risk to the extent permitted by applicable law.</p>
""".strip()
        }
    ]

    created_any = False

    for item in defaults:
        existing = Page.query.filter_by(key=item["key"]).first()

        if not existing:
            db.session.add(Page(
                key=item["key"],
                title=item["title"],
                slug=item["slug"],
                content=item["content"],
                meta_description=item["title"],
                is_published=True,
                is_system=True,
                show_in_footer=True
            ))

            created_any = True

    if created_any:
        db.session.commit()