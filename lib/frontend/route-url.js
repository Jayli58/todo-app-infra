// for cloudfront function
// enable nextjs routing in s3 + cloudfront
// e.g.: callback/ -> callback/index.html
function handler(event) {
    const request = event.request;
    const uri = request.uri;

    // Append index.html to requests ending in '/'
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }

    return request;
}

// Export for Jest
// module.exports = { handler };
