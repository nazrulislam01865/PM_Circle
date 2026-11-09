<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your PM Circle password</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fa;color:#172842;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <div style="display:none;font-size:1px;line-height:1px;max-height:0;overflow:hidden;opacity:0;">Securely reset your PM Circle password. The link expires in {{ $expiresInMinutes }} minutes.</div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f7fa;">
        <tr><td align="center" style="padding:32px 16px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background:#ffffff;border:1px solid #dce4ee;border-radius:12px;">
                <tr><td style="padding:24px 32px;border-bottom:1px solid #dce4ee;">
                    <span style="font-size:20px;line-height:28px;font-weight:700;color:#075eb5;">PM Circle</span>
                    <span style="display:block;margin-top:2px;font-size:12px;line-height:16px;color:#4c5d74;">by ITQAN</span>
                </td></tr>
                <tr><td style="padding:30px 32px 16px;">
                    <h1 style="margin:0 0 12px;color:#172842;font-size:28px;line-height:36px;font-weight:700;">Reset your password</h1>
                    <p style="margin:0;color:#4c5d74;font-size:15px;line-height:24px;">We received a request to reset the password for your PM Circle account. Use the secure link below to choose a new password.</p>
                </td></tr>
                <tr><td align="center" style="padding:16px 32px;">
                    <a href="{{ $resetUrl }}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:#075eb5;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;">Reset my password</a>
                    <p style="margin:16px 0 0;color:#4c5d74;font-size:13px;line-height:20px;">This link expires in <strong>{{ $expiresInMinutes }} minutes</strong> and can be used only once.</p>
                </td></tr>
                <tr><td style="padding:8px 32px 28px;">
                    <p style="margin:0 0 8px;color:#4c5d74;font-size:13px;line-height:20px;">If the button doesn't work, copy this link into your browser:</p>
                    <p style="margin:0;overflow-wrap:anywhere;word-break:break-all;font-size:13px;line-height:20px;"><a href="{{ $resetUrl }}" style="color:#075eb5;text-decoration:underline;">{{ $resetUrl }}</a></p>
                    <p style="margin:20px 0 0;color:#4c5d74;font-size:13px;line-height:20px;">Didn't request a password reset? You can safely ignore this email. Your password will not change unless you use the link.</p>
                </td></tr>
            </table>
            <p style="margin:16px 0 0;color:#4c5d74;font-size:12px;line-height:16px;">PM Circle by ITQAN · Account security</p>
        </td></tr>
    </table>
</body>
</html>
