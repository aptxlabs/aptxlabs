export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const formData = await request.formData();
    const email = formData.get("email");
    const name = formData.get("name");
    const message = formData.get("message");
    const botField = formData.get("bot-field");
    const recaptchaToken = formData.get("g-recaptcha-response");

    // Honeypot spam check
    if (botField) {
      return new Response("Spam detected", { status: 400 });
    }

    // Verify reCAPTCHA
    const recaptchaVerify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
    });

    const recaptchaResult = await recaptchaVerify.json();
    if (!recaptchaResult.success || (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5)) {
      return new Response("reCAPTCHA failed", { status: 403 });
    }

    // Send email via Brevo
    const emailData = {
      sender: { name: name || "Website Contact", email: "no-reply@aptxlabs.com" },
      to: [{ email: "fx@aptxlabs.com", name: "APT XLabs" }],
      replyTo: { email },
      subject: `New message from ${name}`,
      textContent: `Name: ${name}\nEmail: ${email}\n\n${message}`
    };

    const emailResp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.BREVO_API_KEY
      },
      body: JSON.stringify(emailData),
    });

    if (emailResp.ok) {
      return new Response("Message sent!", { status: 200 });
    } else {
      const errorText = await emailResp.text();
      return new Response("Email send failed: " + errorText, { status: 500 });
    }
  }
};
