const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);
export async function handleIncomingSMS(req, res) {
    const incomingMsg = req.body.Body;
    const senderNumber = req.body.From;
    // AI Agent Processing simulation
    const replyText = `[OpenArva AI]: Received your prompt "${incomingMsg}"`;
    await client.messages.create({
        body: replyText,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: senderNumber
    });
    res.send('<Response></Response>');
}
