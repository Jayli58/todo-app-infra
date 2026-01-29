import { sharedConfig } from "../shared";

export const feConfig = {
    domain: sharedConfig.domain,
    // obtain from FrontendCertStack output in us-east-1 for cloudfront
    // todo: avoid to be public; may also need git record delete
    ssmParamName4CertArn: '/todoapp/fe/certArn',
    // url for cognito callback
    callbackUrls: [
        `https://${sharedConfig.domain}/callback/`,
    ],
    // GitHub repo for OIDC trust in frontend stack (owner/repo)
    githubOidcRepo: "Jayli58/todo-app-frontend",
}
