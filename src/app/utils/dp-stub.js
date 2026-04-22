// Server-side stub — @digitalpersona packages use WebSocket at module init
// and cannot run in Node.js. This empty module is used during SSR.
// The real packages are loaded in the browser via dynamic import.
export default {};
