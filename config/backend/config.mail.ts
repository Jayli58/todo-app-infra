import { sharedConfig } from "../shared";

export const mailConfig = {
    // Must be verified if with SES (email identity)
    domain: sharedConfig.domain,
    fromEmail: `noreply@${sharedConfig.domain}`,
    senderName: 'Todo App',
    replyTo: `support@${sharedConfig.domain}`,
    region: 'ap-southeast-2',
    ssmParamName4ResendApiKey: '/todoapp/resend/apiKey'
}
