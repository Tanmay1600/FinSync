"""Email service for sending emails"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    """Service for sending emails via Gmail SMTP"""
    
    def __init__(self):
        self.sender_email = os.getenv('EMAIL')
        self.sender_password = os.getenv('APP_PASSWORD')
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
    
    def validate_config(self) -> tuple:
        """Validate email configuration
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.sender_email:
            return False, "EMAIL environment variable not set"
        
        if not self.sender_password:
            return False, "APP_PASSWORD environment variable not set"
        
        return True, None
    
    def send_email(self, recipient_email: str, subject: str, html_body: str) -> tuple:
        """Send email via Gmail SMTP
        
        Args:
            recipient_email: Email address of recipient
            subject: Email subject
            html_body: HTML content of email body
            
        Returns:
            Tuple of (success, error_message)
        """
        
        # Validate configuration
        is_valid, error = self.validate_config()
        if not is_valid:
            return False, error
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.sender_email
            message["To"] = recipient_email
            
            # Attach HTML body
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()  # Secure connection
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())
            
            return True, None
        
        except smtplib.SMTPAuthenticationError:
            return False, "Invalid email or app password"
        except smtplib.SMTPException as e:
            return False, f"SMTP error: {str(e)}"
        except Exception as e:
            return False, f"Email sending failed: {str(e)}"
    
    def send_invite_email(self, recipient_email: str, recipient_name: str, invite_token: str, frontend_url: str) -> tuple:
        """Send invite email to agent
        
        Args:
            recipient_email: Email address of new agent
            recipient_name: Name of new agent
            invite_token: Invite token for verification
            frontend_url: Frontend URL where agent sets password
            
        Returns:
            Tuple of (success, error_message)
        """
        
        subject = "You have been invited to join Hack The Tank"
        
        # Create invite link with token
        invite_link = f"{frontend_url}/accept-invite?token={invite_token}"
        
        # HTML email template
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; margin: 20px 0; border-radius: 5px; }}
                    .button {{ display: inline-block; padding: 12px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                    .footer {{ font-size: 12px; color: #666; text-align: center; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Hack The Tank!</h1>
                    </div>
                    
                    <div class="content">
                        <p>Hi <strong>{recipient_name}</strong>,</p>
                        
                        <p>You have been invited to join Hack The Tank as an Agent. To get started, please complete your registration by setting a password.</p>
                        
                        <p>
                            <a href="{invite_link}" class="button">Accept Invitation & Set Password</a>
                        </p>
                        
                        <p><strong>Or copy this link:</strong></p>
                        <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 3px;">
                            {invite_link}
                        </p>
                        
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This invitation link will expire in 24 hours</li>
                            <li>You will need to set a strong password</li>
                            <li>After setting your password, you can log in directly</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>
                            If you did not request this invitation or have any questions,
                            please contact your organization administrator.
                        </p>
                        <p>&copy; 2026 Hack The Tank. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(recipient_email, subject, html_body)


# Create global email service instance
email_service = EmailService()
